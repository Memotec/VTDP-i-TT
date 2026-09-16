import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Helper for lazy GenAI client creation
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // AI Image generation endpoint using Gemini/Imagen
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, itemName, category, style } = req.body;
      if (!prompt && !itemName) {
        return res.status(400).json({ error: "Yêu cầu cung cấp tên thiết bị hoặc câu lệnh mô tả." });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(500).json({
          error: "GEMINI_API_KEY chưa được cấu hình trong Settings > Secrets.",
          useFallback: true,
        });
      }

      // Construct high-detail professional prompt for aviation CNS/ATM equipment
      let fullPrompt = prompt
        ? prompt
        : `A professional industrial photograph of aviation CNS equipment "${itemName}" (${category || "Telecommunications/ATM"}), high-precision aviation communication device, clean studio lighting, realistic details, 4K resolution`;

      if (style === "rack") {
        fullPrompt += ", mounted inside an air traffic control telecommunications server rack, front panel LEDs and meters glowing, photorealistic";
      } else if (style === "studio") {
        fullPrompt += ", isolated clean bright background, 3D commercial product photography, sharp focus";
      } else if (style === "schematic") {
        fullPrompt += ", technical isometric schematic blueprint style with labeled component connectors";
      }

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [{ text: fullPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            },
          },
        });

        let generatedImageUrl = "";
        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const mime = part.inlineData.mimeType || "image/png";
              generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!generatedImageUrl) {
          return res.status(200).json({
            success: false,
            useFallback: true,
            error: "Không tìm thấy dữ liệu ảnh trả về từ mô hình AI.",
          });
        }

        return res.json({
          success: true,
          imageUrl: generatedImageUrl,
          promptUsed: fullPrompt,
        });
      } catch (genError: any) {
        const isQuota =
          genError?.message?.includes("429") ||
          genError?.status === "RESOURCE_EXHAUSTED" ||
          genError?.message?.includes("Quota exceeded") ||
          genError?.message?.includes("limit: 0");

        if (isQuota) {
          return res.status(200).json({
            success: false,
            quotaExceeded: true,
            useFallback: true,
            error:
              "API Key hiện tại đang ở gói Miễn phí (Free Tier) có giới hạn 0 lượt tạo ảnh trực tiếp cho mô hình Imagen/gemini-3.1-flash-lite-image. Hệ thống đã tự động gán hình ảnh minh họa CNS độ phân giải cao tương ứng từ thư viện đồ họa đài trạm.",
          });
        }

        return res.status(200).json({
          success: false,
          useFallback: true,
          error: genError?.message || "Lỗi kết nối dịch vụ tạo ảnh AI Imagen.",
        });
      }
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        useFallback: true,
        error: err.message || "Lỗi máy chủ.",
      });
    }
  });

  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwPYEY6_0ng5msNsNrddYbvkYKx3NNIDWWNbxDxCwkMw0GdtCYEMFsE0hfJVROWsVcs/exec";

  // Cloud Proxy Push Endpoint (Bypasses browser CORS limitations, follows redirects, inspects true Google Apps Script response)
  app.post("/api/cloud-proxy/push", async (req, res) => {
    try {
      const { url, data, inventory, dispatched, categories, user, queue } = req.body;
      const cleanUrl = (url && typeof url === "string" && url.trim().length > 0) ? url.trim() : DEFAULT_GAS_URL;

      const params = new URLSearchParams();
      params.append("action", "AUTO_SYNC_BATCH");
      params.append("type", "full_sync");
      params.append("data", typeof data === "string" ? data : JSON.stringify(data || inventory || []));
      params.append("inventory", typeof inventory === "string" ? inventory : JSON.stringify(inventory || data || []));
      if (dispatched) {
        params.append("dispatched", typeof dispatched === "string" ? dispatched : JSON.stringify(dispatched));
      }
      if (categories) {
        params.append("categories", typeof categories === "string" ? categories : JSON.stringify(categories));
      }
      if (queue) {
        params.append("queue", typeof queue === "string" ? queue : JSON.stringify(queue));
      }
      params.append("user", user || "guest");
      params.append("timestamp", Date.now().toString());
      params.append("clientVersion", "3.6-enterprise");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const gasRes = await fetch(cleanUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: params.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const resText = (await gasRes.text()).trim();

      // Check for Google Apps Script server-side exceptions
      if (resText.includes("Sorry, it is not possible to delete all non-frozen rows")) {
        return res.status(200).json({
          success: false,
          error: "Lỗi Google Sheet: Apps Script đang gặp lỗi 'Sorry, it is not possible to delete all non-frozen rows'. Cần cập nhật file Code.gs trong Apps Script để tránh xoá toàn bộ dòng.",
          scriptErrorCode: "NON_FROZEN_ROWS_EXCEPTION",
          raw: resText,
        });
      }

      if (resText.startsWith("ERROR:") || resText.includes("Exception:")) {
        return res.status(200).json({
          success: false,
          error: `Google Apps Script gặp lỗi ngoại lệ: ${resText}`,
          scriptErrorCode: "APPS_SCRIPT_EXCEPTION",
          raw: resText,
        });
      }

      if (resText.startsWith("<!DOCTYPE") || resText.startsWith("<html")) {
        return res.status(200).json({
          success: false,
          error: "Google Apps Script yêu cầu đăng nhập hoặc trang HTML. Vui lòng cấp quyền 'Anyone' (Bất kỳ ai).",
          scriptErrorCode: "HTML_AUTH_ERROR",
          raw: resText.slice(0, 300),
        });
      }

      // Try parsing JSON from Apps Script
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(resText);
      } catch {
        // Text response without error
      }

      if (parsedJson && parsedJson.success === false) {
        return res.status(200).json({
          success: false,
          error: parsedJson.error || "Google Apps Script phản hồi thất bại.",
          raw: resText,
        });
      }

      return res.status(200).json({
        success: true,
        message: parsedJson?.message || "Đã lưu dữ liệu vào Google Sheet thành công qua Cloud Proxy!",
        count: parsedJson?.count || (Array.isArray(data || inventory) ? (data || inventory).length : 0),
        raw: resText,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        return res.status(200).json({
          success: false,
          error: "Hết thời gian chờ (Timeout 45s) khi gửi dữ liệu lên Google Apps Script.",
        });
      }
      return res.status(200).json({
        success: false,
        error: `Lỗi kết nối proxy tới Google Apps Script: ${err.message || String(err)}`,
      });
    }
  });

  // Cloud Proxy Pull Endpoint
  app.post("/api/cloud-proxy/pull", async (req, res) => {
    try {
      const { url } = req.body;
      const cleanUrl = (url && typeof url === "string" && url.trim().length > 0) ? url.trim() : DEFAULT_GAS_URL;

      const fetchUrl = `${cleanUrl}${cleanUrl.includes("?") ? "&" : "?"}t=${Date.now()}&source=cloud_proxy`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const gasRes = await fetch(fetchUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Aviation-CNS-CloudProxy/1.0",
        },
      });
      clearTimeout(timeoutId);

      if (!gasRes.ok) {
        return res.status(200).json({
          success: false,
          error: `Google Apps Script phản hồi HTTP ${gasRes.status}`,
        });
      }

      const resText = (await gasRes.text()).trim();

      if (resText.startsWith("<!DOCTYPE") || resText.startsWith("<html")) {
        return res.status(200).json({
          success: false,
          error: "Google Apps Script trả về HTML. Vui lòng cấp quyền 'Anyone' (Bất kỳ ai).",
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(resText);
      } catch {
        return res.status(200).json({
          success: false,
          error: "Dữ liệu trả về từ Apps Script không đúng định dạng JSON.",
          raw: resText.slice(0, 300),
        });
      }

      return res.status(200).json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        error: `Lỗi kéo dữ liệu: ${err.message || String(err)}`,
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

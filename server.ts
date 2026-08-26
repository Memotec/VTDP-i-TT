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

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InventoryItem, UsageSlip, DispatchedRecord } from '../types.ts';
import { HandoverRow } from '../components/HandoverModal.tsx';

/**
 * Utility to generate high-quality PDF files for Vietnamese official forms:
 * 1. Biên bản bàn giao thiết bị (Handover Protocol)
 * 2. Phiếu báo sử dụng thiết bị (Usage Ticket)
 * 3. Biên bản kiểm kê & Tồn kho (Audit Report)
 * 4. Sổ tổng hợp theo dõi thiết bị (Dispatched Registry)
 */

interface HandoverMeta {
  handoverNo: string;
  handoverLocation: string;
  handoverDay: string;
  handoverMonth: string;
  handoverYear: string;
  handoverReason: string;
  handoverGiverDept: string;
  handoverGiverName: string;
  handoverGiverPos: string;
  handoverReceiverDept: string;
  handoverReceiverName: string;
  handoverReceiverPos: string;
}

// Helper to render HTML to PDF via html2canvas + jsPDF with isolated iframe environment
async function renderHtmlToPdf(htmlContent: string, fileName: string, landscape = false): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    // 1. Create a clean isolated iframe to completely isolate html2canvas from global Tailwind v4 OKLCH CSS
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.top = '0';
    iframe.style.width = landscape ? '1122px' : '794px';
    iframe.style.height = '1200px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-99999';
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Không thể khởi tạo môi trường render tài liệu');
      }

      const cleanHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Tài liệu xuất PDF</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              font-family: 'Times New Roman', Times, 'DejaVu Sans', serif;
              background: #ffffff !important;
              color: #000000 !important;
              width: ${landscape ? '297mm' : '210mm'};
              margin: 0 auto;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          <div id="pdf-render-root">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(cleanHtml);
      iframeDoc.close();

      // Allow DOM layout and fonts to settle
      await new Promise(r => setTimeout(r, 250));

      const targetEl = iframeDoc.getElementById('pdf-render-root') || iframeDoc.body;

      const canvas = await html2canvas(targetEl as HTMLElement, {
        scale: 2, // High resolution for crisp text
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: landscape ? 1122 : 794,
        scrollX: 0,
        scrollY: 0
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Không thể xử lý đồ họa trang in');
      }

      const pdf = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = landscape ? 297 : 210;
      const pdfHeight = landscape ? 210 : 297;

      // Slice the full-length canvas into exact A4-ratio page tiles
      const pageCanvasHeightInPx = Math.floor((canvas.width * pdfHeight) / pdfWidth);
      const totalPages = Math.ceil(canvas.height / pageCanvasHeightInPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        const sourceY = page * pageCanvasHeightInPx;
        const currentSliceHeight = Math.min(pageCanvasHeightInPx, canvas.height - sourceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageCanvasHeightInPx;
        const ctx = pageCanvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            currentSliceHeight,
            0,
            0,
            canvas.width,
            currentSliceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.96);
          pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
      }

      // Safe filename sanitize
      const sanitizedFileName = (fileName || 'BaoCao_TaiLieu.pdf')
        .replace(/[/\\?%*:|"<>]/g, '_');

      pdf.save(sanitizedFileName);
      resolve();
    } catch (err) {
      console.warn('Lỗi khi render PDF qua html2canvas:', err);
      // Fallback: trigger print dialog if direct canvas fails
      try {
        const fallbackSuccess = safePrintHtml(htmlContent);
        if (fallbackSuccess) {
          resolve();
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback in ấn thất bại:', fallbackErr);
      }
      reject(err);
    } finally {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
  });
}

/**
 * 1. Xuất BIÊN BẢN BÀN GIAO THIẾT BỊ thành PDF
 */
export async function exportHandoverToPDF(meta: HandoverMeta, rows: HandoverRow[]) {
  const rowsHtml = rows.map((row, idx) => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 11pt;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; font-weight: bold;">${row.name}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 11pt;">${row.unit || 'Cái'}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 11pt; font-weight: bold;">${row.qty}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 11pt;">${row.quality || 'Tốt (Mới 100%)'}</td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 10.5pt;">${row.specs || 'N/A'}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-family: monospace; font-size: 11pt; font-weight: bold;">${row.sn || 'N/A'}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: left; font-size: 10.5pt;">${row.note || ''}</td>
    </tr>
  `).join('');

  const html = `
    <div style="padding: 15mm 15mm 15mm 20mm; box-sizing: border-box; background: #fff; width: 210mm;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 44%; text-align: center; vertical-align: top;">
            <div style="font-size: 10pt; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;"><u>TRUNG TÂM BĐKT</u></div>
            <div style="font-size: 11pt; margin-top: 8px;">Số: <strong>${meta.handoverNo || '......../KT'}</strong></div>
          </td>
          <td style="width: 56%; text-align: center; vertical-align: top;">
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 12pt; font-weight: bold; margin-top: 2px;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <div style="font-size: 11.5pt; font-style: italic; margin-top: 6px;">TP. Hồ Chí Minh, ngày ${meta.handoverDay} tháng ${meta.handoverMonth} năm ${meta.handoverYear}</div>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 25px 0 15px 0;">
        <h1 style="font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">
          BIÊN BẢN GIAO, NHẬN TÀI SẢN, CÔNG CỤ
        </h1>
        <div style="font-size: 11pt; font-style: italic; margin-top: 4px; color: #333;">
          (V/v trích xuất, bàn giao tài sản thiết bị chuyên ngành kỹ thuật hàng không)
        </div>
      </div>

      <div style="font-size: 12pt; margin-bottom: 15px; line-height: 1.5;">
        Hôm nay, ngày ${meta.handoverDay} tháng ${meta.handoverMonth} năm ${meta.handoverYear}, tại ${meta.handoverLocation || 'Trung tâm Bảo đảm Kỹ thuật'}.
      </div>

      <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px;">
        THÀNH PHẦN BÀN GIAO:
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12pt;">
        <tr>
          <td style="font-weight: bold;" colSpan="2">
            1. Đại diện bên giao: ${meta.handoverGiverDept || 'Đội Thông tin – Trung tâm BĐKT'}
          </td>
        </tr>
        <tr>
          <td style="width: 55%; padding-left: 20px; padding-top: 4px;">
            Ông (bà): <span style="font-weight: bold;">${meta.handoverGiverName || '...........................................'}</span>
          </td>
          <td style="width: 45%; padding-top: 4px;">
            Chức vụ: <span style="font-weight: bold;">${meta.handoverGiverPos || '...........................................'}</span>
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding-top: 8px;" colSpan="2">
            2. Đại diện bên nhận: ${meta.handoverReceiverDept || '...........................................'}
          </td>
        </tr>
        <tr>
          <td style="width: 55%; padding-left: 20px; padding-top: 4px;">
            Ông (bà): <span style="font-weight: bold;">${meta.handoverReceiverName || '...........................................'}</span>
          </td>
          <td style="width: 45%; padding-top: 4px;">
            Chức vụ: <span style="font-weight: bold;">${meta.handoverReceiverPos || '...........................................'}</span>
          </td>
        </tr>
      </table>

      <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px;">
        DANH MỤC TÀI SẢN, CÔNG CỤ BÀN GIAO:
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 7px 4px; width: 35px; text-align: center; font-size: 10.5pt; font-weight: bold;">STT</th>
            <th style="border: 1px solid #000; padding: 7px 6px; text-align: center; font-size: 10.5pt; font-weight: bold;">Tên tài sản, công cụ</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 45px; text-align: center; font-size: 10.5pt; font-weight: bold;">ĐVT</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 55px; text-align: center; font-size: 10.5pt; font-weight: bold;">Số lượng</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 80px; text-align: center; font-size: 10.5pt; font-weight: bold;">Chất lượng</th>
            <th style="border: 1px solid #000; padding: 7px 6px; text-align: center; font-size: 10.5pt; font-weight: bold;">Nhãn hiệu, quy cách</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 95px; text-align: center; font-size: 10.5pt; font-weight: bold;">S/N</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 80px; text-align: center; font-size: 10.5pt; font-weight: bold;">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="font-size: 12pt; margin-top: 12px; margin-bottom: 8px;">
        Lý do bàn giao: <span style="font-weight: bold;">${meta.handoverReason || 'Phục vụ nhiệm vụ chuyên môn và vận hành trang thiết bị'}</span>
      </div>

      <div style="font-size: 11.5pt; font-style: italic; margin-bottom: 25px;">
        Biên bản này được lập thành hai bản, mỗi bên giữ một bản, các bản có giá trị pháp lý như nhau.
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">ĐẠI DIỆN BÊN GIAO</div>
            <div style="font-size: 11pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 70px;"></div>
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">${meta.handoverGiverName || ''}</div>
          </td>
          <td style="width: 50%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">ĐẠI DIỆN BÊN NHẬN</div>
            <div style="font-size: 11pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 70px;"></div>
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">${meta.handoverReceiverName || ''}</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const safeNo = (meta.handoverNo || 'BBBG').replace(/[\/\\]/g, '-');
  const fileName = `BienBan_BanGiao_${safeNo}.pdf`;
  await renderHtmlToPdf(html, fileName);
}

/**
 * 2. Xuất PHIẾU BÁO SỬ DỤNG THIẾT BỊ thành PDF
 */
export async function exportUsageSlipToPDF(slip: UsageSlip, currentUsername?: string) {
  const now = new Date();
  let printDay = String(now.getDate()).padStart(2, '0');
  let printMonth = String(now.getMonth() + 1).padStart(2, '0');
  let printYear = String(now.getFullYear());

  if (slip.date) {
    const match = slip.date.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      printDay = match[1].padStart(2, '0');
      printMonth = match[2].padStart(2, '0');
      printYear = match[3];
    }
  }

  const docNo = slip.docNumber || `PBSD-${printYear}/${String(slip.id.slice(-4)).padStart(3, '0')}`;
  const giverName = slip.giverName || (currentUsername ? `Kỹ sư ${currentUsername}` : 'Admin Kho');
  const giverDept = slip.giverDept || 'Đội Thông Tin – Trung tâm Bảo đảm Kỹ thuật';
  const giverPos = slip.giverPos || 'Kỹ sư phụ trách kho';
  const receiverName = slip.user || 'Kỹ sư tiếp nhận';
  const receiverDept = slip.receiverDept || 'Tổ Vận Hành CNS/ATM';
  const receiverPos = slip.receiverPos || 'Kỹ sư trực ban / Khai thác';

  const html = `
    <div style="padding: 15mm 15mm 15mm 20mm; box-sizing: border-box; background: #fff; width: 210mm;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
        <tr>
          <td style="width: 46%; text-align: center; vertical-align: top;">
            <div style="font-size: 10pt; text-transform: uppercase;">TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM</div>
            <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 1px;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
            <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 1px;">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;"><u>ĐỘI THÔNG TIN CNS/ATM</u></div>
            <div style="font-size: 11pt; font-style: italic; margin-top: 6px;">Số: <strong>${docNo}</strong></div>
          </td>
          <td style="width: 54%; text-align: center; vertical-align: top;">
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 12pt; font-weight: bold; margin-top: 2px;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <div style="font-size: 11.5pt; font-style: italic; margin-top: 6px;">TP. Hồ Chí Minh, ngày ${printDay} tháng ${printMonth} năm ${printYear}</div>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 22px 0 16px 0;">
        <h1 style="font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">
          PHIẾU BÁO SỬ DỤNG - BÀN GIAO THIẾT BỊ
        </h1>
        <div style="font-size: 11pt; font-style: italic; margin-top: 4px; color: #333;">
          (V/v trích xuất, cấp phát và luân chuyển vật tư dự phòng phục vụ kỹ thuật hàng không)
        </div>
      </div>

      <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px;">
        I. CĂN CỨ VÀ THÀNH PHẦN THỰC HIỆN:
      </div>

      <div style="font-size: 11.5pt; line-height: 1.5; margin-bottom: 12px;">
        <div style="margin: 4px 0;">
          <strong>1. Bên Giao (Cấp xuất kho):</strong> ${giverDept}
        </div>
        <div style="margin: 4px 0; padding-left: 18px;">
          - Đại diện: <strong>${giverName}</strong> &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; Chức vụ: <strong>${giverPos}</strong>
        </div>
        <div style="margin: 6px 0 4px 0;">
          <strong>2. Bên Nhận (Tiếp nhận sử dụng):</strong> ${receiverDept}
        </div>
        <div style="margin: 4px 0; padding-left: 18px;">
          - Đại diện: <strong>${receiverName}</strong> &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; Chức vụ: <strong>${receiverPos}</strong>
        </div>
        <div style="margin: 6px 0 4px 0;">
          <strong>3. Thời gian cấp xuất:</strong> ${slip.date}
        </div>
        <div style="margin: 4px 0;">
          <strong>4. Vị trí lắp đặt / Hệ thống đích:</strong> <strong>${slip.targetLocation || 'Hệ thống thiết bị chuyên ngành'}</strong>
        </div>
      </div>

      <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px;">
        II. DANH MỤC TRANG THIẾT BỊ VÀ VẬT TƯ BÀN GIAO:
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 10px 0 16px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 7px 4px; width: 32px; text-align: center; font-weight: bold; text-transform: uppercase;">STT</th>
            <th style="border: 1px solid #000; padding: 7px 6px; text-align: center; font-weight: bold; text-transform: uppercase;">Tên Trang Thiết Bị / Vật Tư</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 85px; text-align: center; font-weight: bold; text-transform: uppercase;">Chủng Loại</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 85px; text-align: center; font-weight: bold; text-transform: uppercase;">Part No.</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 105px; text-align: center; font-weight: bold; text-transform: uppercase;">Serial No. (S/N)</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 42px; text-align: center; font-weight: bold; text-transform: uppercase;">SL</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 48px; text-align: center; font-weight: bold; text-transform: uppercase;">ĐVT</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 80px; text-align: center; font-weight: bold; text-transform: uppercase;">Kho Xuất</th>
            <th style="border: 1px solid #000; padding: 7px 4px; width: 80px; text-align: center; font-weight: bold; text-transform: uppercase;">Hiện Trạng</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">01</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: left; font-weight: bold;">${slip.itemName}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${slip.category || 'Vật tư CNS'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${slip.pn || 'N/A'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-family: monospace; font-weight: bold;">${slip.sn}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${slip.qtyUsed}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${slip.unit || 'Chiếc'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${slip.warehouse || 'Kho TT'}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Tốt (100%)</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px;">
        III. MỤC ĐÍCH SỬ DỤNG VÀ THÔNG SỐ KỸ THUẬT:
      </div>
      <div style="font-size: 11.5pt; line-height: 1.5; margin-bottom: 12px;">
        <div style="margin: 3px 0;">
          - <strong>Mục đích sử dụng:</strong> ${slip.purpose || 'Thay thế dự phòng / Bảo dưỡng định kỳ'}
        </div>
        <div style="margin: 3px 0;">
          - <strong>Ghi chú & Tham số kỹ thuật:</strong> ${slip.notes || 'Thiết bị đã kiểm tra các tham số kỹ thuật đạt chuẩn, hoạt động ổn định trước khi đưa vào vận hành.'}
        </div>
      </div>

      <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px;">
        IV. TRÁCH NHIỆM & QUY ĐỊNH BẢO QUẢN:
      </div>
      <div style="font-size: 11pt; font-style: italic; line-height: 1.45; margin-bottom: 18px;">
        <p style="margin: 3px 0;">1. Bên nhận chịu trách nhiệm tiếp nhận, bảo quản và vận hành trang thiết bị đúng quy trình kỹ thuật hàng không quy định.</p>
        <p style="margin: 3px 0;">2. Khi có sự cố hư hỏng hoặc thu hồi hoàn kho, kỹ sư quản lý phải báo cáo kịp thời cho Phụ trách kho và Lãnh đạo Đội để lập biên bản xử lý cập nhật hệ thống.</p>
        <p style="margin: 3px 0;">3. Phiếu này được lập thành 02 bản có giá trị pháp lý như nhau, lưu tại Sổ Theo Dõi Đội Thông Tin và Đơn vị tiếp nhận sử dụng.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 22px;">
        <tr>
          <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px;">
            <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">KỸ SƯ TIẾP NHẬN</div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 65px;"></div>
            <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">${receiverName}</div>
          </td>
          <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px;">
            <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">NGƯỜI LẬP PHIẾU</div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 65px;"></div>
            <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">${giverName}</div>
          </td>
          <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px;">
            <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">PHỤ TRÁCH KHO</div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 65px;"></div>
            <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">...............................</div>
          </td>
          <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px;">
            <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">LÃNH ĐẠO ĐỘI</div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 2px;">(Ký, đóng dấu duyệt)</div>
            <div style="height: 65px;"></div>
            <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">...............................</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const safeNo = docNo.replace(/[\/\\]/g, '-');
  const fileName = `PhieuBaoSuDung_${safeNo}.pdf`;
  await renderHtmlToPdf(html, fileName);
}

/**
 * 3. Xuất BIÊN BẢN KIỂM KÊ THIẾT BỊ / SỔ THEO DÕI BÀN GIAO thành PDF
 */
export async function exportDispatchedRegistryToPDF(records: DispatchedRecord[], currentUsername?: string) {
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const rowsHtml = records.map((r, idx) => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10pt;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-family: monospace; font-size: 9.5pt; font-weight: bold;">${r.docNumber || `#${r.id.slice(-5)}`}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 10pt; font-weight: bold;">${r.itemName}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-family: monospace; font-size: 9.5pt; font-weight: bold;">${r.sn}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10pt; font-weight: bold;">${r.qty} ${r.unit || 'Bộ'}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 9.5pt;">${r.date.split(' ')[0]}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 10pt;">${r.receiverName} (${r.receiverDept || 'Tổ Vận Hành'})</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 9.5pt;">${r.targetLocation || 'Hệ thống'}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 9.5pt; font-weight: bold;">${r.status === 'DEPLOYED' ? 'ĐANG SỬ DỤNG' : 'ĐÃ THU HỒI'}</td>
    </tr>
  `).join('');

  const html = `
    <div style="padding: 12mm 15mm; box-sizing: border-box; background: #fff; width: 297mm;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
          <td style="width: 45%; text-align: center; vertical-align: top;">
            <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
            <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;"><u>TRUNG TÂM BẢO ĐẢM KỸ THUẬT</u></div>
          </td>
          <td style="width: 55%; text-align: center; vertical-align: top;">
            <div style="font-size: 10pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 10.5pt; font-weight: bold; margin-top: 2px;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 4px;">Ngày trích xuất: ${todayStr}</div>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 15px 0 5px 0;">
        <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0;">
          SỔ TỔNG HỢP THEO DÕI THIẾT BỊ ĐÃ BÀN GIAO & ĐƯA VÀO SỬ DỤNG
        </h1>
        <div style="font-size: 10pt; font-style: italic; margin-top: 4px;">
          (Tổng số: ${records.length} hồ sơ | Đang hoạt động ngoài hệ thống: ${records.filter(r => r.status === 'DEPLOYED').length} thiết bị)
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 6px 4px; width: 35px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">STT</th>
            <th style="border: 1px solid #000; padding: 6px; width: 95px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Mã Số / Số PB</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Tên Thiết Bị / Vật Tư</th>
            <th style="border: 1px solid #000; padding: 6px; width: 110px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">S/N</th>
            <th style="border: 1px solid #000; padding: 6px; width: 70px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Số Lượng</th>
            <th style="border: 1px solid #000; padding: 6px; width: 85px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Ngày Xuất</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Người / Đơn Vị Nhận</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Vị Trí Lắp Đặt / Sử Dụng</th>
            <th style="border: 1px solid #000; padding: 6px; width: 100px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Tình Trạng</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">NGƯỜI LẬP BÁO CÁO</div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; font-size: 11pt;">${currentUsername ? `Kỹ sư ${currentUsername.toUpperCase()}` : 'Kỹ sư Quản lý Kho'}</div>
          </td>
          <td style="width: 50%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">LÃNH ĐẠO PHÊ DUYỆT</div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; font-size: 11pt;">ĐỘI TRƯỞNG</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const fileName = `SoTheoDoi_BanGiao_SuDung_${todayStr.replace(/[\/\\]/g, '-')}.pdf`;
  await renderHtmlToPdf(html, fileName, true); // Landscape
}

/**
 * 4. Xuất BIÊN BẢN KIỂM KÊ KHO TỔNG HỢP thành PDF
 */
export async function exportAuditReportToPDF(
  inventory: InventoryItem[],
  inspectorName: string,
  auditDate: string,
  auditLocation: string,
  auditNote: string
) {
  const totalQty = inventory.reduce((sum, item) => sum + (item.qty || 0), 0);
  const okItems = inventory.filter(item => item.auditStatus === 'OK');
  const missingItems = inventory.filter(item => item.auditStatus === 'MISSING');
  const uncheckedItems = inventory.filter(item => !item.auditStatus);

  const rowsHtml = inventory.map((item, idx) => `
    <tr>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9.5pt;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 5px 6px; text-align: left; font-size: 9.5pt; font-weight: bold;">${item.name}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9pt;">${item.category || '-'}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-family: monospace; font-size: 9pt;">${item.pn || '-'}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-family: monospace; font-size: 9.5pt; font-weight: bold;">${item.sn}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-family: monospace; font-size: 9pt; font-weight: bold;">${item.warehouse || '-'}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9pt;">${item.loc || '-'}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9.5pt; font-weight: bold;">${item.qty}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9pt; font-weight: bold;">
        ${item.auditStatus === 'OK' ? 'ĐỦ / TỐT' : (item.auditStatus === 'MISSING' ? 'THIẾU/HỎNG' : 'CHƯA KIỂM')}
      </td>
      <td style="border: 1px solid #000; padding: 5px; text-align: left; font-size: 8.5pt; font-style: italic;">${item.auditNote || ''}</td>
    </tr>
  `).join('');

  const html = `
    <div style="padding: 12mm 15mm; box-sizing: border-box; background: #fff; width: 210mm;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px;">
        <tr>
          <td style="width: 52%; text-align: left; vertical-align: middle; padding-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; flex-shrink: 0;">
                ${DOI_THONG_TIN_LOGO_SVG}
              </div>
              <div>
                <div style="font-size: 8pt; color: #475569; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase;">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #1e40af; margin-top: 1px;"><u>ĐỘI THÔNG TIN</u></div>
                <div style="font-size: 8pt; font-style: italic; color: #64748b;">Số: ......./BB-ĐTT-KK</div>
              </div>
            </div>
          </td>
          <td style="width: 48%; text-align: center; vertical-align: middle; padding-bottom: 6px;">
            <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 10.5pt; font-weight: bold; margin-top: 2px;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <div style="font-size: 8.5pt; font-style: italic; margin-top: 4px;">TP. Hồ Chí Minh, ngày ${auditDate}</div>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 15px 0 10px 0;">
        <h1 style="font-size: 13.5pt; font-weight: bold; text-transform: uppercase; margin: 0;">
          BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ DỰ PHÒNG TẠI CHỖ
        </h1>
        <div style="font-size: 9.5pt; font-style: italic; margin-top: 3px;">
          (Phục vụ công tác bảo đảm kỹ thuật thông tin, dẫn đường, giám sát hàng không)
        </div>
      </div>

      <div style="font-size: 10pt; line-height: 1.45; margin-bottom: 10px;">
        <p style="margin: 3px 0;">Hôm nay, ngày <strong>${auditDate}</strong>, tại: <strong>${auditLocation}</strong>.</p>
        <p style="margin: 3px 0;">Tổ kiểm kê đã tiến hành kiểm tra thực tế đối soát toàn bộ danh mục trang thiết bị, vật tư dự phòng tại chỗ của Đội Thông Tin.</p>
        <div style="margin-top: 4px;">
          <strong>Thành phần tham gia kiểm kê:</strong>
          <div style="padding-left: 10px; margin-top: 2px;">
            1. Ông/Bà: <strong>${inspectorName}</strong> - Kỹ sư trực ban / Đại diện Tổ Kiểm kê<br/>
            2. Ông/Bà: ................................................................ - Kỹ sư phụ trách kho vật tư<br/>
            3. Ông/Bà: ................................................................ - Đại diện Lãnh đạo Đội Thông Tin
          </div>
        </div>
      </div>

      <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">
        I. KẾT QUẢ KIỂM KÊ THỰC TẾ CHI TIẾT TỪNG THIẾT BỊ (${inventory.length} MỤC):
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 5px; width: 28px; text-align: center; font-size: 9.5pt; font-weight: bold;">STT</th>
            <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9.5pt; font-weight: bold;">Tên Trang Thiết Bị / Vật Tư</th>
            <th style="border: 1px solid #000; padding: 5px; width: 75px; text-align: center; font-size: 9.5pt; font-weight: bold;">Phân Loại</th>
            <th style="border: 1px solid #000; padding: 5px; width: 80px; text-align: center; font-size: 9.5pt; font-weight: bold;">P/N</th>
            <th style="border: 1px solid #000; padding: 5px; width: 95px; text-align: center; font-size: 9.5pt; font-weight: bold;">Serial (S/N)</th>
            <th style="border: 1px solid #000; padding: 5px; width: 70px; text-align: center; font-size: 9.5pt; font-weight: bold;">Mã Kho</th>
            <th style="border: 1px solid #000; padding: 5px; width: 65px; text-align: center; font-size: 9.5pt; font-weight: bold;">Vị Trí</th>
            <th style="border: 1px solid #000; padding: 5px; width: 35px; text-align: center; font-size: 9.5pt; font-weight: bold;">SL</th>
            <th style="border: 1px solid #000; padding: 5px; width: 75px; text-align: center; font-size: 9.5pt; font-weight: bold;">Hiện Trạng</th>
            <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9.5pt; font-weight: bold;">Ghi Chú</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="font-size: 10pt; border: 1px solid #000; padding: 8px; margin-bottom: 15px; background: #fdfdfd;">
        <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">II. TỔNG HỢP VÀ ĐÁNH GIÁ:</div>
        <div style="display: flex; justify-content: space-between; line-height: 1.4;">
          <div>
            • Tổng số danh mục thiết bị: <strong>${inventory.length}</strong> mã<br/>
            • Tổng số lượng hiện vật: <strong>${totalQty}</strong> bộ/chiếc<br/>
            • Số thiết bị kiểm đạt (ĐỦ / TỐT): <strong style="color: green;">${okItems.length}</strong> mã
          </div>
          <div>
            • Số thiết bị sai lệch (THIẾU / HỎNG): <strong style="color: red;">${missingItems.length}</strong> mã<br/>
            • Số thiết bị chưa đối soát: <strong>${uncheckedItems.length}</strong> mã<br/>
            • Tỷ lệ sẵn sàng: <strong>${inventory.length > 0 ? Math.round((okItems.length / inventory.length) * 100) : 0}%</strong>
          </div>
        </div>
        <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #ccc;">
          <strong>Đánh giá chung:</strong> ${auditNote}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr>
          <td style="width: 33.3%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase;">ĐẠI DIỆN TỔ KIỂM KÊ</div>
            <div style="font-size: 9pt; font-style: italic;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 10pt;">${inspectorName}</div>
          </td>
          <td style="width: 33.3%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase;">TRƯỞNG CA TRỰC BĐKT</div>
            <div style="font-size: 9pt; font-style: italic;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 10pt;">........................................</div>
          </td>
          <td style="width: 33.3%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase;">ĐỘI TRƯỞNG ĐỘI THÔNG TIN</div>
            <div style="font-size: 9pt; font-style: italic;">(Ký, đóng dấu xác nhận)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 10pt;">........................................</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const fileName = `BienBan_KiemKe_Kho_${auditDate.replace(/[\/\\]/g, '-')}.pdf`;
  await renderHtmlToPdf(html, fileName);
}

/**
 * SVG Logo Đội Thông Tin - CNS/ATM
 */
export const DOI_THONG_TIN_LOGO_SVG = `
<svg width="58" height="58" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="48" fill="#0F172A" stroke="#2563EB" stroke-width="3"/>
  <circle cx="50" cy="50" r="41" fill="#1E293B" stroke="#38BDF8" stroke-width="1.2" stroke-dasharray="3 2"/>
  <path d="M50 16 A34 34 0 0 1 84 50" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M50 25 A25 25 0 0 1 75 50" stroke="#60A5FA" stroke-width="2" stroke-linecap="round"/>
  <path d="M50 34 A16 16 0 0 1 66 50" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round"/>
  <polygon points="50,42 43,76 57,76" fill="#CBD5E1"/>
  <line x1="41" y1="62" x2="59" y2="62" stroke="#94A3B8" stroke-width="2"/>
  <line x1="45" y1="52" x2="55" y2="52" stroke="#94A3B8" stroke-width="1.5"/>
  <circle cx="50" cy="40" r="4" fill="#EF4444"/>
  <path d="M20 68 Q35 63 50 68 Q65 63 80 68 Q65 74 50 72 Q35 74 20 68 Z" fill="#F59E0B"/>
  <text x="50" y="89" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="900" text-anchor="middle" letter-spacing="0.6">ĐỘI THÔNG TIN</text>
</svg>
`;

export interface InventoryExportOptions {
  currentUsername?: string;
  categoryFilter?: string;
  searchQuery?: string;
  reportTitle?: string;
  reportDate?: string;
  warehouseLocation?: string;
  inspectorName?: string;
  notes?: string;
}

/**
 * 5. Xuất BÁO CÁO TỒN KHO HIỆN TẠI (ĐÃ LỌC) THÀNH PDF CHUYÊN NGHIỆP CÓ LOGO ĐỘI THÔNG TIN
 */
export async function exportInventoryReportToPDF(
  filteredItems: InventoryItem[],
  options: InventoryExportOptions = {}
) {
  const now = new Date();
  const dateStr = options.reportDate || now.toLocaleDateString('vi-VN');
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const username = options.currentUsername || options.inspectorName || 'Kỹ sư Quản lý Kho';
  const category = options.categoryFilter && options.categoryFilter !== 'ALL' ? options.categoryFilter : 'Tất cả chuyên mục';
  const search = options.searchQuery ? `Từ khóa: "${options.searchQuery}"` : 'Toàn bộ';
  
  const totalQty = filteredItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const okItems = filteredItems.filter(item => item.auditStatus === 'OK');
  const missingItems = filteredItems.filter(item => item.auditStatus === 'MISSING');
  const uncheckedItems = filteredItems.filter(item => !item.auditStatus);
  const okQty = okItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const missingQty = missingItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const rowsHtml = filteredItems.map((item, idx) => {
    const statusBg = item.auditStatus === 'OK' ? '#dcfce7' : (item.auditStatus === 'MISSING' ? '#fee2e2' : '#f1f5f9');
    const statusColor = item.auditStatus === 'OK' ? '#15803d' : (item.auditStatus === 'MISSING' ? '#b91c1c' : '#475569');
    const statusText = item.auditStatus === 'OK' ? 'ĐỦ / ĐẠT' : (item.auditStatus === 'MISSING' ? 'THIẾU / HỎNG' : 'CHƯA KIỂM');

    return `
      <tr style="background-color: ${idx % 2 === 1 ? '#fcfcfc' : '#ffffff'};">
        <td style="border: 1px solid #cbd5e1; padding: 6px 3px; text-align: center; font-size: 9pt; font-weight: bold; color: #475569;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-family: monospace; font-size: 8.5pt; font-weight: bold; color: #1e3a8a;">
          ${item.warehouse || '-'}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">
          <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a;">${item.name}</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 1px;">Chủng loại: <strong>${item.category || 'Vật tư CNS'}</strong></div>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-family: monospace; font-size: 9pt; color: #334155;">
          ${item.pn || '-'}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-family: monospace; font-size: 9pt; font-weight: bold; color: #0f172a;">
          ${item.sn || '-'}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: left; font-size: 8.5pt; color: #334155;">
          ${item.loc || '-'}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 3px; text-align: center; font-size: 10pt; font-weight: bold; color: #0f172a;">
          ${item.qty}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; font-weight: bold; font-size: 8pt; border: 1px solid ${statusColor};">
            ${statusText}
          </span>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; font-size: 8pt; color: #475569; font-style: italic;">
          ${item.auditNote || (item.auditDate ? `Đã kiểm ${item.auditDate}` : 'Đang lưu kho dự phòng')}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="padding: 10mm 12mm 10mm 12mm; box-sizing: border-box; background: #ffffff; width: 297mm; color: #0f172a; font-family: 'Times New Roman', Times, serif;">
      
      <!-- TOP HEADER WITH OFFICIAL LOGO & NATIONAL EMBLEM -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">
        <tr>
          <td style="width: 52%; vertical-align: middle; text-align: left; padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 54px; height: 54px; flex-shrink: 0;">
                ${DOI_THONG_TIN_LOGO_SVG}
              </div>
              <div>
                <div style="font-size: 8pt; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM</div>
                <div style="font-size: 9pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM - TRUNG TÂM BĐKT</div>
                <div style="font-size: 10.5pt; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-top: 1px;">
                  <u>ĐỘI THÔNG TIN (CNS/ATM)</u>
                </div>
                <div style="font-size: 8pt; color: #64748b; font-style: italic; margin-top: 2px;">Hệ thống Quản lý Vật tư Dự phòng & Kiểm kê Kỹ thuật</div>
              </div>
            </div>
          </td>
          <td style="width: 48%; vertical-align: middle; text-align: center; padding-bottom: 8px;">
            <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #0f172a;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 11pt; font-weight: bold; color: #0f172a; margin-top: 1px;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <div style="font-size: 8.5pt; font-style: italic; color: #475569; margin-top: 4px;">TP. Hồ Chí Minh, ngày ${dateStr} (Trích xuất: ${timeStr})</div>
          </td>
        </tr>
      </table>

      <!-- DOCUMENT TITLE -->
      <div style="text-align: center; margin: 10px 0 10px 0;">
        <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #1e3a8a;">
          ${options.reportTitle || 'BÁO CÁO TỒN KHO & HIỆN TRẠNG TRANG THIẾT BỊ DỰ PHÒNG TẠI CHỖ'}
        </h1>
        <div style="font-size: 9pt; font-style: italic; margin-top: 3px; color: #475569;">
          (Dữ liệu trích xuất theo danh mục đã lọc • Phục vụ công tác bảo đảm kỹ thuật thông tin, dẫn đường, giám sát)
        </div>
      </div>

      <!-- FILTER & SUMMARY METRICS BAR -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <tr>
          <td style="width: 50%; padding: 8px 12px; vertical-align: top; border-right: 1px solid #e2e8f0; font-size: 9pt; line-height: 1.5;">
            <div>• Phân loại lọc: <strong>${category}</strong></div>
            <div>• Điều kiện tìm kiếm: <strong>${search}</strong></div>
            <div>• Vị trí kho kiểm tra: <strong>${options.warehouseLocation || 'Kho Vật tư Dự phòng Đội Thông Tin - Tầng 3 Đài KSKLL'}</strong></div>
            <div>• Người trích xuất: <strong>${username}</strong></div>
          </td>
          <td style="width: 50%; padding: 8px 12px; vertical-align: top; font-size: 9pt; line-height: 1.5;">
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <div>
                • Tổng số danh mục: <strong style="color: #1e40af; font-size: 10pt;">${filteredItems.length}</strong> mã<br/>
                • Tổng số hiện vật: <strong style="color: #1e40af; font-size: 10pt;">${totalQty}</strong> chiếc/bộ<br/>
                • Tỷ lệ đạt chuẩn: <strong style="color: #15803d; font-size: 10pt;">${filteredItems.length > 0 ? Math.round((okItems.length / filteredItems.length) * 100) : 0}%</strong>
              </div>
              <div style="padding-left: 10px; border-left: 1px dashed #cbd5e1;">
                • Đủ / Tốt: <strong style="color: #15803d;">${okItems.length} mã (${okQty} món)</strong><br/>
                • Thiếu / Cảnh báo: <strong style="color: #b91c1c;">${missingItems.length} mã (${missingQty} món)</strong><br/>
                • Chưa đối soát: <strong style="color: #475569;">${uncheckedItems.length} mã</strong>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- STANDARD TABLE FORMAT -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
        <thead>
          <tr style="background-color: #1e3a8a; color: #ffffff;">
            <th style="border: 1px solid #0f172a; padding: 7px 3px; width: 30px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">STT</th>
            <th style="border: 1px solid #0f172a; padding: 7px 4px; width: 85px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Mã Kho / QR</th>
            <th style="border: 1px solid #0f172a; padding: 7px 8px; text-align: left; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Tên Trang Thiết Bị / Vật Tư</th>
            <th style="border: 1px solid #0f172a; padding: 7px 4px; width: 110px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Part Number</th>
            <th style="border: 1px solid #0f172a; padding: 7px 4px; width: 110px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Serial (S/N)</th>
            <th style="border: 1px solid #0f172a; padding: 7px 6px; width: 110px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Vị Trí / Tủ</th>
            <th style="border: 1px solid #0f172a; padding: 7px 3px; width: 45px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">SL</th>
            <th style="border: 1px solid #0f172a; padding: 7px 4px; width: 85px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Hiện Trạng</th>
            <th style="border: 1px solid #0f172a; padding: 7px 6px; width: 130px; text-align: center; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">Ghi Chú & Lịch Sử</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- SIGNATURE AND APPROVAL SECTION -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid;">
        <tr>
          <td style="width: 33.3%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 9.5pt; text-transform: uppercase; color: #0f172a;">NGƯỜI LẬP BÁO CÁO</div>
            <div style="font-size: 8.5pt; font-style: italic; color: #64748b; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">${username}</div>
          </td>
          <td style="width: 33.3%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 9.5pt; text-transform: uppercase; color: #0f172a;">KỸ SƯ PHỤ TRÁCH KHO</div>
            <div style="font-size: 8.5pt; font-style: italic; color: #64748b; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">........................................</div>
          </td>
          <td style="width: 33.3%; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 9.5pt; text-transform: uppercase; color: #0f172a;">ĐỘI TRƯỞNG ĐỘI THÔNG TIN</div>
            <div style="font-size: 8.5pt; font-style: italic; color: #64748b; margin-top: 2px;">(Ký, đóng dấu xác nhận)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">........................................</div>
          </td>
        </tr>
      </table>

      <!-- FOOTER NOTE -->
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between;">
        <div>Tài liệu kỹ thuật nội bộ • Đội Thông Tin CNS/ATM • Trung tâm Bảo đảm Kỹ thuật - Công ty Quản lý bay miền Nam</div>
        <div>Hệ thống CNS v3.1 • Mã báo cáo: BC-CNS-${Date.now().toString().slice(-6)}</div>
      </div>
    </div>
  `;

  const safeCategory = (options.categoryFilter || 'All').replace(/[\/\s\\&]/g, '_');
  const fileName = `BaoCao_TonKho_DoiThongTin_${safeCategory}_${dateStr.replace(/[\/\\]/g, '-')}.pdf`;
  await renderHtmlToPdf(html, fileName, true); // Landscape A4 format
}

/**
 * Universal safe print runner:
 * Handles popup blockers & iframe sandboxes gracefully by falling back to a hidden iframe.
 */
export function safePrintHtml(htmlContent: string): boolean {
  const fullDocument = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <title>In Báo Cáo - Đội Thông Tin CNS</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Times New Roman', Times, 'DejaVu Sans', serif;
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table {
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  try {
    const win = window.open('', '_blank');
    if (win && win.document) {
      win.document.open();
      win.document.write(fullDocument);
      win.document.close();
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (e) {
          console.warn('win.print error:', e);
        }
      }, 400);
      return true;
    }
  } catch (e) {
    console.warn('window.open blocked, falling back to hidden iframe:', e);
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullDocument);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error('Hidden iframe print error:', printErr);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 4000);
      }, 500);
      return true;
    }
  } catch (iframeErr) {
    console.error('Print iframe fallback failed:', iframeErr);
  }
  return false;
}

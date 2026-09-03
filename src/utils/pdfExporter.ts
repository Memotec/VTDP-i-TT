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

// Helper to render HTML to PDF via html2canvas + jsPDF
async function renderHtmlToPdf(htmlContent: string, fileName: string, landscape = false) {
  // Create temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = landscape ? '297mm' : '210mm';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Times New Roman', Times, serif";
  container.style.zIndex = '-9999';
  container.innerHTML = htmlContent;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = landscape ? 297 : 210;
    const pdfHeight = landscape ? 210 : 297;

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(fileName);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
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
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <tr>
          <td style="width: 45%; text-align: center; vertical-align: top;">
            <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
            <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
            <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-top: 1px;"><u>ĐỘI THÔNG TIN</u></div>
            <div style="font-size: 9.5pt; font-style: italic; margin-top: 4px;">Số: ......./BB-ĐTT-KK</div>
          </td>
          <td style="width: 55%; text-align: center; vertical-align: top;">
            <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 10.5pt; font-weight: bold; margin-top: 2px;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <div style="font-size: 10pt; font-style: italic; margin-top: 4px;">TP. Hồ Chí Minh, ngày ${auditDate}</div>
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

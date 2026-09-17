import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageOrientation,
  ShadingType
} from 'docx';
import { InventoryItem, UsageSlip, DispatchedRecord } from '../types.ts';
import { HandoverRow } from '../components/HandoverModal.tsx';

// Helper to trigger browser download of a docx file
export async function downloadDocxDocument(doc: Document, fileName: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (fileName || 'BaoCao_CNS.docx').replace(/[/\\?%*:|"<>]/g, '_');
  a.download = safeName.endsWith('.docx') ? safeName : `${safeName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Common reusable border style for tables
const standardBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '000000'
};

const cellBorders = {
  top: standardBorder,
  bottom: standardBorder,
  left: standardBorder,
  right: standardBorder
};

const headerBgShading = {
  fill: 'E2E8F0',
  type: ShadingType.CLEAR,
  color: 'auto'
};

/**
 * 1. XUẤT BÁO CÁO TỒN KHO & HIỆN TRẠNG TRANG THIẾT BỊ DỰ PHÒNG RA TỆP WORD (.DOCX)
 */
export async function exportInventoryReportToDocx(
  items: InventoryItem[],
  options: {
    currentUsername?: string;
    categoryFilter?: string;
    searchQuery?: string;
    reportTitle?: string;
    reportDate?: string;
    warehouseLocation?: string;
    notes?: string;
  } = {}
): Promise<void> {
  const now = new Date();
  const dateStr = options.reportDate || now.toLocaleDateString('vi-VN');
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const username = options.currentUsername || 'Kỹ sư Quản lý Kho';
  const category = options.categoryFilter && options.categoryFilter !== 'ALL' ? options.categoryFilter : 'Tất cả chuyên mục';
  const location = options.warehouseLocation || 'Kho Vật Tư Đội Thông Tin - Trung Tâm BĐKT';

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const okItems = items.filter(item => item.auditStatus === 'OK');
  const missingItems = items.filter(item => item.auditStatus === 'MISSING');
  const uncheckedItems = items.filter(item => !item.auditStatus);

  // Table Rows for Inventory
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 500, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 2600, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tên Thiết Bị / Vật Tư', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1400, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Part Number', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1500, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Serial Number', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 900, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kho', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 900, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vị Trí', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 500, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1100, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hiện Trạng', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1200, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ghi Chú', bold: true, size: 20 })] })]
        })
      ]
    }),
    ...items.map((item, idx) => {
      const status = item.auditStatus === 'OK' ? 'ĐỦ / TỐT' : (item.auditStatus === 'MISSING' ? 'HỎNG / THIẾU' : 'CHƯA KIỂM');
      return new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 500, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 2600, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: item.name, bold: true, size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1400, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.pn || '-', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1500, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.sn || '-', bold: true, font: 'Consolas', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 900, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.warehouse || '-', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 900, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.loc || '-', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 500, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.qty}`, bold: true, size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1100, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: status, bold: item.auditStatus === 'OK', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1200, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: item.auditNote || item.notes || '', italics: true, size: 18 })] })]
          })
        ]
      });
    })
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 20mm
              bottom: 1134,
              left: 1417, // 25mm
              right: 1134
            }
          }
        },
        children: [
          // Official Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TỔNG CÔNG TY QUẢN LÝ BAY VN', size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CÔNG TY QUẢN LÝ BAY MIỀN NAM', size: 18, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TRUNG TÂM BẢO ĐẢM KỸ THUẬT', size: 19, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐỘI THÔNG TIN (CNS/ATM)', size: 19, bold: true, underline: {} })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: `Số: ......./BC-ĐTT`, size: 19, italics: true })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, underline: {}, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: `TP. Hồ Chí Minh, ngày ${dateStr}`, italics: true, size: 19 })] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: (options.reportTitle || 'BÁO CÁO TỒN KHO & HIỆN TRẠNG TRANG THIẾT BỊ DỰ PHÒNG').toUpperCase(),
                bold: true,
                size: 26
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `(Thời điểm trích xuất dữ liệu: ${dateStr} hồi ${timeStr} | Địa điểm: ${location})`,
                italics: true,
                size: 19
              })
            ]
          }),

          // Metadata summary
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `• Người lập báo cáo: `, bold: true, size: 20 }), new TextRun({ text: username, size: 20 })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `• Phạm vi chuyên mục: `, bold: true, size: 20 }), new TextRun({ text: category, size: 20 })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `• Tổng số danh mục thiết bị: `, bold: true, size: 20 }), new TextRun({ text: `${items.length} mã thiết bị`, bold: true, size: 20 })] }),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `• Tổng số lượng hiện vật: `, bold: true, size: 20 }), new TextRun({ text: `${totalQty} bộ/chiếc`, bold: true, size: 20 }), new TextRun({ text: `  (Đủ/Tốt: ${okItems.length} | Thiếu/Hỏng: ${missingItems.length} | Chưa kiểm: ${uncheckedItems.length})`, italics: true, size: 19 })] }),

          // Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          // Notes if any
          ...(options.notes ? [
            new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: `Đánh giá & Ghi chú bổ sung: `, bold: true, size: 20 }), new TextRun({ text: options.notes, italics: true, size: 20 })] })
          ] : []),

          // Signatures
          new Paragraph({ spacing: { before: 300 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NGƯỜI LẬP BÁO CÁO', bold: true, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1000 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: username, bold: true, size: 20 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PHỤ TRÁCH KHO VẬT TƯ', bold: true, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1000 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '............................................', size: 18 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LÃNH ĐẠO ĐỘI THÔNG TIN', bold: true, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, đóng dấu xác nhận)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1000 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '............................................', size: 18 })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const fileName = `BaoCao_TonKho_CNS_${dateStr.replace(/[\/\\]/g, '-')}.docx`;
  await downloadDocxDocument(doc, fileName);
}

/**
 * 2. XUẤT BIÊN BẢN BÀN GIAO THIẾT BỊ (HANDOVER PROTOCOL) RA TỆP WORD (.DOCX)
 */
export async function exportHandoverToDocx(
  meta: {
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
  },
  rows: HandoverRow[]
): Promise<void> {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 500, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 2800, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tên Tài Sản, Công Cụ', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 700, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐVT', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 700, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1400, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chất Lượng', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1800, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nhãn Hiệu, Quy Cách', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1600, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Số Serial (S/N)', bold: true, size: 20 })] })]
        }),
        new TableCell({
          borders: cellBorders,
          shading: headerBgShading,
          width: { size: 1200, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ghi Chú', bold: true, size: 20 })] })]
        })
      ]
    }),
    ...rows.map((r, idx) => (
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 500, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 2800, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: r.name, bold: true, size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 700, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.unit || 'Cái', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 700, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${r.qty}`, bold: true, size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1400, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.quality || 'Tốt (Mới 100%)', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1800, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: r.specs || '-', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1600, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.sn || '-', bold: true, font: 'Consolas', size: 19 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1200, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: r.note || '', italics: true, size: 18 })] })]
          })
        ]
      })
    ))
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1417,
              right: 1134
            }
          }
        },
        children: [
          // Header table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CÔNG TY QUẢN LÝ BAY MIỀN NAM', size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TRUNG TÂM BẢO ĐẢM KỸ THUẬT', size: 19, bold: true, underline: {} })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: `Số: ${meta.handoverNo || '......../KT'}`, size: 19, bold: true })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, underline: {}, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `TP. Hồ Chí Minh, ngày ${meta.handoverDay || '...'} tháng ${meta.handoverMonth || '...'} năm ${meta.handoverYear || '......'}`, italics: true, size: 19 })] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 260, after: 80 },
            children: [
              new TextRun({
                text: 'BIÊN BẢN GIAO, NHẬN TÀI SẢN, CÔNG CỤ',
                bold: true,
                size: 26
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '(V/v trích xuất, bàn giao tài sản thiết bị chuyên ngành kỹ thuật hàng không)',
                italics: true,
                size: 19
              })
            ]
          }),

          // Context
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: `Hôm nay, ngày ${meta.handoverDay || '...'} tháng ${meta.handoverMonth || '...'} năm ${meta.handoverYear || '......'}, tại ${meta.handoverLocation || 'Trung tâm Bảo đảm Kỹ thuật'}.`,
                size: 20
              })
            ]
          }),

          // Parties
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'THÀNH PHẦN BÀN GIAO:', bold: true, size: 20 })] }),
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `1. Đại diện bên giao (Bên A): `, bold: true, size: 20 }), new TextRun({ text: meta.handoverGiverDept || 'Đội Thông tin – Trung tâm BĐKT', size: 20 })] }),
          new Paragraph({ spacing: { after: 80 }, indent: { left: 400 }, children: [
            new TextRun({ text: `- Ông/Bà: `, size: 20 }),
            new TextRun({ text: meta.handoverGiverName || '...........................................', bold: true, size: 20 }),
            new TextRun({ text: `    |    Chức vụ: `, size: 20 }),
            new TextRun({ text: meta.handoverGiverPos || 'Kỹ sư quản lý kho', bold: true, size: 20 })
          ] }),

          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `2. Đại diện bên nhận (Bên B): `, bold: true, size: 20 }), new TextRun({ text: meta.handoverReceiverDept || '...........................................', size: 20 })] }),
          new Paragraph({ spacing: { after: 160 }, indent: { left: 400 }, children: [
            new TextRun({ text: `- Ông/Bà: `, size: 20 }),
            new TextRun({ text: meta.handoverReceiverName || '...........................................', bold: true, size: 20 }),
            new TextRun({ text: `    |    Chức vụ: `, size: 20 }),
            new TextRun({ text: meta.handoverReceiverPos || '...........................................', bold: true, size: 20 })
          ] }),

          // Items Table
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'DANH MỤC TÀI SẢN, CÔNG CỤ BÀN GIAO:', bold: true, size: 20 })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          // Reason & Conclusion
          new Paragraph({
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({ text: 'Lý do bàn giao: ', bold: true, size: 20 }),
              new TextRun({ text: meta.handoverReason || 'Phục vụ nhiệm vụ chuyên môn và vận hành trang thiết bị kỹ thuật', size: 20 })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Biên bản này được lập thành hai bản, mỗi bên giữ một bản, các bản có giá trị pháp lý như nhau.',
                italics: true,
                size: 19
              })
            ]
          }),

          // Signatures
          new Paragraph({ spacing: { before: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐẠI DIỆN BÊN GIAO', bold: true, size: 21 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1100 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: meta.handoverGiverName || '', bold: true, size: 21 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐẠI DIỆN BÊN NHẬN', bold: true, size: 21 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1100 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: meta.handoverReceiverName || '', bold: true, size: 21 })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const safeNo = (meta.handoverNo || 'BBBG').replace(/[\/\\]/g, '-');
  const fileName = `BienBan_BanGiao_${safeNo}.docx`;
  await downloadDocxDocument(doc, fileName);
}

/**
 * 3. XUẤT PHIẾU BÁO SỬ DỤNG VẬT TƯ / THIẾT BỊ RA TỆP WORD (.DOCX)
 */
export async function exportUsageSlipToDocx(
  slip: UsageSlip,
  currentUsername?: string
): Promise<void> {
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

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1417,
              right: 1134
            }
          }
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 48, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM', size: 17 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CÔNG TY QUẢN LÝ BAY MIỀN NAM', size: 18, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TRUNG TÂM BẢO ĐẢM KỸ THUẬT', size: 18, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐỘI THÔNG TIN CNS/ATM', size: 19, bold: true, underline: {} })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: `Số: ${docNo}`, size: 19, bold: true, italics: true })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 52, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, underline: {}, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: `TP. Hồ Chí Minh, ngày ${printDay} tháng ${printMonth} năm ${printYear}`, italics: true, size: 19 })] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: 'PHIẾU BÁO SỬ DỤNG - BÀN GIAO THIẾT BỊ',
                bold: true,
                size: 26
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '(V/v trích xuất, cấp phát và luân chuyển vật tư dự phòng phục vụ kỹ thuật hàng không)',
                italics: true,
                size: 19
              })
            ]
          }),

          // Section I
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'I. CĂN CỨ VÀ THÀNH PHẦN THỰC HIỆN:', bold: true, size: 20 })] }),
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '1. Bên Giao (Cấp xuất kho): ', bold: true, size: 20 }), new TextRun({ text: giverDept, size: 20 })] }),
          new Paragraph({ spacing: { after: 60 }, indent: { left: 400 }, children: [
            new TextRun({ text: '- Đại diện: ', size: 20 }),
            new TextRun({ text: giverName, bold: true, size: 20 }),
            new TextRun({ text: '   |   Chức vụ: ', size: 20 }),
            new TextRun({ text: giverPos, bold: true, size: 20 })
          ] }),
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '2. Bên Nhận (Tiếp nhận sử dụng): ', bold: true, size: 20 }), new TextRun({ text: receiverDept, size: 20 })] }),
          new Paragraph({ spacing: { after: 60 }, indent: { left: 400 }, children: [
            new TextRun({ text: '- Đại diện: ', size: 20 }),
            new TextRun({ text: receiverName, bold: true, size: 20 }),
            new TextRun({ text: '   |   Chức vụ: ', size: 20 }),
            new TextRun({ text: receiverPos, bold: true, size: 20 })
          ] }),
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '3. Thời gian cấp xuất: ', bold: true, size: 20 }), new TextRun({ text: slip.date, size: 20 })] }),
          new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: '4. Vị trí lắp đặt / Hệ thống đích: ', bold: true, size: 20 }), new TextRun({ text: slip.targetLocation || 'Hệ thống thiết bị chuyên ngành', bold: true, size: 20 })] }),

          // Section II: Items Table
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'II. DANH MỤC TRANG THIẾT BỊ VÀ VẬT TƯ BÀN GIAO:', bold: true, size: 20 })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 2600, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tên Thiết Bị / Vật Tư', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chủng Loại', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Part No.', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Serial No.', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 600, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 700, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐVT', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kho Xuất', bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hiện Trạng', bold: true, size: 19 })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, width: { size: 500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '01', size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 2600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: slip.itemName, bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slip.category || 'Vật tư CNS', size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slip.pn || 'N/A', size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slip.sn, bold: true, font: 'Consolas', size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 600, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${slip.qtyUsed}`, bold: true, size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 700, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slip.unit || 'Chiếc', size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slip.warehouse || 'Kho TT', size: 19 })] })] }),
                  new TableCell({ borders: cellBorders, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tốt (100%)', bold: true, size: 19 })] })] })
                ]
              })
            ]
          }),

          // Section III
          new Paragraph({ spacing: { before: 180, after: 60 }, children: [new TextRun({ text: 'III. MỤC ĐÍCH SỬ DỤNG VÀ THÔNG SỐ KỸ THUẬT:', bold: true, size: 20 })] }),
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '- Mục đích sử dụng: ', bold: true, size: 20 }), new TextRun({ text: slip.purpose || 'Thay thế dự phòng / Bảo dưỡng định kỳ', size: 20 })] }),
          new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '- Ghi chú & Tham số kỹ thuật: ', bold: true, size: 20 }), new TextRun({ text: slip.notes || 'Thiết bị đã kiểm tra các tham số kỹ thuật đạt chuẩn, hoạt động ổn định.', italics: true, size: 20 })] }),

          // Section IV
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'IV. TRÁCH NHIỆM & QUY ĐỊNH BẢO QUẢN:', bold: true, size: 20 })] }),
          new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: '1. Bên nhận chịu trách nhiệm tiếp nhận, bảo quản và vận hành trang thiết bị đúng quy trình kỹ thuật hàng không.', italics: true, size: 19 })] }),
          new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: '2. Khi có sự cố hư hỏng hoặc thu hồi hoàn kho, kỹ sư quản lý phải báo cáo kịp thời để lập biên bản xử lý cập nhật.', italics: true, size: 19 })] }),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '3. Phiếu này được lập thành 02 bản có giá trị pháp lý như nhau, lưu tại Sổ Theo Dõi Đội Thông Tin và Đơn vị sử dụng.', italics: true, size: 19 })] }),

          // 4 Signatures
          new Paragraph({ spacing: { before: 160 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'KỸ SƯ TIẾP NHẬN', bold: true, size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 16 })] }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: receiverName, bold: true, size: 19 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NGƯỜI LẬP PHIẾU', bold: true, size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 16 })] }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: giverName, bold: true, size: 19 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PHỤ TRÁCH KHO', bold: true, size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 16 })] }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '...........................', size: 18 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LÃNH ĐẠO ĐỘI', bold: true, size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, duyệt đóng dấu)', italics: true, size: 16 })] }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '...........................', size: 18 })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const safeNo = docNo.replace(/[\/\\]/g, '-');
  const fileName = `PhieuBaoSuDung_${safeNo}.docx`;
  await downloadDocxDocument(doc, fileName);
}

/**
 * 4. XUẤT BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ DỰ PHÒNG TẠI CHỖ RA TỆP WORD (.DOCX)
 */
export async function exportAuditReportToDocx(
  inventory: InventoryItem[],
  inspectorName: string,
  auditDate: string,
  auditLocation: string,
  auditNote: string
): Promise<void> {
  const totalQty = inventory.reduce((sum, item) => sum + (item.qty || 0), 0);
  const okItems = inventory.filter(item => item.auditStatus === 'OK');
  const missingItems = inventory.filter(item => item.auditStatus === 'MISSING');
  const uncheckedItems = inventory.filter(item => !item.auditStatus);
  const okPercent = inventory.length > 0 ? Math.round((okItems.length / inventory.length) * 100) : 0;

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 450, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tên Thiết Bị / Vật Tư', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Phân Loại', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'P/N', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Serial (S/N)', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kho', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vị Trí', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hiện Trạng', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ghi Chú', bold: true, size: 19 })] })] })
      ]
    }),
    ...inventory.map((item, idx) => {
      const status = item.auditStatus === 'OK' ? 'ĐỦ / TỐT' : (item.auditStatus === 'MISSING' ? 'THIẾU/HỎNG' : 'CHƯA KIỂM');
      return new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 450, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.name, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.category || '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.pn || '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.sn, bold: true, font: 'Consolas', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.warehouse || '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.loc || '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.qty}`, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1100, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: status, bold: item.auditStatus === 'OK', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.auditNote || '', italics: true, size: 17 })] })] })
        ]
      });
    })
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1417,
              right: 1134
            }
          }
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 48, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CÔNG TY QUẢN LÝ BAY MIỀN NAM', size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TRUNG TÂM BẢO ĐẢM KỸ THUẬT', size: 18, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐỘI THÔNG TIN', size: 19, bold: true, underline: {} })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'Số: ......./BB-ĐTT-KK', size: 19, italics: true })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 52, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, underline: {}, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: `TP. Hồ Chí Minh, ngày ${auditDate}`, italics: true, size: 19 })] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: 'BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ DỰ PHÒNG TẠI CHỖ',
                bold: true,
                size: 25
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: '(Phục vụ công tác bảo đảm kỹ thuật thông tin, dẫn đường, giám sát hàng không)',
                italics: true,
                size: 19
              })
            ]
          }),

          // Context
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `Hôm nay, ngày `, size: 20 }),
              new TextRun({ text: auditDate, bold: true, size: 20 }),
              new TextRun({ text: `, tại: `, size: 20 }),
              new TextRun({ text: auditLocation, bold: true, size: 20 }),
              new TextRun({ text: `.`, size: 20 })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Tổ kiểm kê đã tiến hành kiểm tra thực tế đối soát toàn bộ danh mục trang thiết bị, vật tư dự phòng tại chỗ của Đội Thông Tin.',
                size: 20
              })
            ]
          }),

          // Attendees
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Thành phần tham gia kiểm kê:', bold: true, size: 20 })] }),
          new Paragraph({ indent: { left: 400 }, spacing: { after: 30 }, children: [new TextRun({ text: `1. Ông/Bà: `, size: 20 }), new TextRun({ text: inspectorName, bold: true, size: 20 }), new TextRun({ text: ` - Kỹ sư trực ban / Đại diện Tổ Kiểm kê`, size: 20 })] }),
          new Paragraph({ indent: { left: 400 }, spacing: { after: 30 }, children: [new TextRun({ text: `2. Ông/Bà: ................................................................ - Kỹ sư phụ trách kho vật tư`, size: 20 })] }),
          new Paragraph({ indent: { left: 400 }, spacing: { after: 140 }, children: [new TextRun({ text: `3. Ông/Bà: ................................................................ - Đại diện Lãnh đạo Đội Thông Tin`, size: 20 })] }),

          // Table Section
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `I. KẾT QUẢ KIỂM KÊ THỰC TẾ CHI TIẾT TỪNG THIẾT BỊ (${inventory.length} MỤC):`, bold: true, size: 20 })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          // Summary box
          new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: 'II. TỔNG HỢP VÀ ĐÁNH GIÁ KIỂM KÊ:', bold: true, size: 20 })] }),
          new Paragraph({ spacing: { after: 40 }, children: [
            new TextRun({ text: `• Tổng số danh mục thiết bị: `, size: 20 }),
            new TextRun({ text: `${inventory.length} mã`, bold: true, size: 20 }),
            new TextRun({ text: `    |    Tổng số lượng hiện vật: `, size: 20 }),
            new TextRun({ text: `${totalQty} bộ/chiếc`, bold: true, size: 20 })
          ] }),
          new Paragraph({ spacing: { after: 40 }, children: [
            new TextRun({ text: `• Số thiết bị kiểm đạt (ĐỦ / TỐT): `, size: 20 }),
            new TextRun({ text: `${okItems.length} mã`, bold: true, size: 20 }),
            new TextRun({ text: `    |    Sai lệch (THIẾU / HỎNG): `, size: 20 }),
            new TextRun({ text: `${missingItems.length} mã`, bold: true, size: 20 }),
            new TextRun({ text: `    |    Chưa kiểm: `, size: 20 }),
            new TextRun({ text: `${uncheckedItems.length} mã`, size: 20 })
          ] }),
          new Paragraph({ spacing: { after: 40 }, children: [
            new TextRun({ text: `• Tỷ lệ trang thiết bị sẵn sàng: `, size: 20 }),
            new TextRun({ text: `${okPercent}%`, bold: true, size: 20 })
          ] }),
          new Paragraph({ spacing: { after: 160 }, children: [
            new TextRun({ text: `• Đánh giá chung: `, bold: true, size: 20 }),
            new TextRun({ text: auditNote, italics: true, size: 20 })
          ] }),

          // Signatures
          new Paragraph({ spacing: { before: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐẠI DIỆN TỔ KIỂM KÊ', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 17 })] }),
                      new Paragraph({ spacing: { before: 900 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: inspectorName, bold: true, size: 19 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TRƯỞNG CA TRỰC BĐKT', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 17 })] }),
                      new Paragraph({ spacing: { before: 900 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '........................................', size: 18 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐỘI TRƯỞNG ĐỘI THÔNG TIN', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, đóng dấu xác nhận)', italics: true, size: 17 })] }),
                      new Paragraph({ spacing: { before: 900 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '........................................', size: 18 })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const fileName = `BienBan_KiemKe_Kho_${auditDate.replace(/[\/\\]/g, '-')}.docx`;
  await downloadDocxDocument(doc, fileName);
}

/**
 * 5. XUẤT SỔ TỔNG HỢP THEO DÕI THIẾT BỊ ĐÃ BÀN GIAO & ĐƯA VÀO SỬ DỤNG RA TỆP WORD (.DOCX KHỔ NGANG LANDSCAPE)
 */
export async function exportDispatchedRegistryToDocx(
  records: DispatchedRecord[],
  currentUsername?: string
): Promise<void> {
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const deployedCount = records.filter(r => r.status === 'DEPLOYED').length;
  const returnedCount = records.filter(r => r.status === 'RETURNED').length;

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mã Số / Số PB', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tên Thiết Bị / Vật Tư', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Serial (S/N)', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 900, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Số Lượng', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ngày Xuất', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Người / Đơn Vị Nhận', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vị Trí Lắp Đặt / Hệ Thống', bold: true, size: 19 })] })] }),
        new TableCell({ borders: cellBorders, shading: headerBgShading, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tình Trạng', bold: true, size: 19 })] })] })
      ]
    }),
    ...records.map((r, idx) => (
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.docNumber || `#${r.id.slice(-5)}`, bold: true, font: 'Consolas', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: r.itemName, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.sn, bold: true, font: 'Consolas', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 900, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${r.qty} ${r.unit || 'Bộ'}`, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.date.split(' ')[0], size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: `${r.receiverName} (${r.receiverDept || 'Tổ Vận Hành'})`, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: r.targetLocation || 'Hệ thống', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.status === 'DEPLOYED' ? 'ĐANG SỬ DỤNG' : 'ĐÃ THU HỒI', bold: true, size: 18 })] })] })
        ]
      })
    ))
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE
            },
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1134,
              right: 1134
            }
          }
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CÔNG TY QUẢN LÝ BAY MIỀN NAM', size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TRUNG TÂM BẢO ĐẢM KỸ THUẬT', size: 19, bold: true, underline: {} })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, underline: {}, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: `Ngày trích xuất sổ: ${todayStr}`, italics: true, size: 19 })] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: 'SỔ TỔNG HỢP THEO DÕI THIẾT BỊ ĐÃ BÀN GIAO & ĐƯA VÀO SỬ DỤNG',
                bold: true,
                size: 26
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `(Tổng số: ${records.length} hồ sơ  |  Đang hoạt động ngoài hệ thống: ${deployedCount} thiết bị  |  Đã thu hồi hoàn kho: ${returnedCount} thiết bị)`,
                italics: true,
                size: 19
              })
            ]
          }),

          // Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          // Signatures
          new Paragraph({ spacing: { before: 300 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NGƯỜI LẬP BÁO CÁO', bold: true, size: 21 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1000 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: currentUsername ? `Kỹ sư ${currentUsername.toUpperCase()}` : 'Kỹ sư Quản lý Kho', bold: true, size: 21 })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LÃNH ĐẠO PHÊ DUYỆT', bold: true, size: 21 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký, đóng dấu duyệt)', italics: true, size: 18 })] }),
                      new Paragraph({ spacing: { before: 1000 } }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐỘI TRƯỞNG ĐỘI THÔNG TIN', bold: true, size: 21 })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const fileName = `SoTheoDoi_BanGiao_SuDung_${todayStr.replace(/[\/\\]/g, '-')}.docx`;
  await downloadDocxDocument(doc, fileName);
}

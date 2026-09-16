import { InventoryItem, UsageSlip } from '../types.ts';
import { HandoverRow } from '../components/HandoverModal.tsx';
import { getOrCreateAppFolder } from './googleDriveService.ts';

export interface GoogleDocFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface GoogleDocContent {
  title: string;
  documentId: string;
  bodyText?: string;
  revisionId?: string;
}

/**
 * Creates a new blank Google Doc inside the application folder or root
 */
export async function createBlankGoogleDoc(
  accessToken: string,
  title: string,
  initialText = ''
): Promise<{ documentId: string; webViewLink: string; title: string }> {
  let folderId = await getOrCreateAppFolder(accessToken).catch(() => 'root');
  if (!folderId) folderId = 'root';

  const bodyData: any = {
    name: title,
    mimeType: 'application/vnd.google-apps.document'
  };
  if (folderId && folderId !== 'root') {
    bodyData.parents = [folderId];
  }

  // 1. Create file in Google Drive as a Google Doc
  let createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });

  if (!createRes.ok && bodyData.parents) {
    // Retry without explicit parents if folder permission issue
    delete bodyData.parents;
    createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });
  }

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    const msg = errData?.error?.message || (createRes.statusText ? createRes.statusText : `HTTP ${createRes.status}`);
    throw new Error(`Lỗi tạo Google Doc (${msg})`);
  }

  const fileData = await createRes.json();
  const documentId = fileData.id;

  // 2. If initialText is provided, insert it via Docs batchUpdate
  if (initialText.trim()) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: initialText
              }
            }
          ]
        })
      });
    } catch (e) {
      console.warn('Lỗi chèn văn bản ban đầu vào Google Doc:', e);
    }
  }

  const webViewLink = `https://docs.google.com/document/d/${documentId}/edit`;
  return { documentId, webViewLink, title };
}

/**
 * Lists all Google Docs created or stored in the Google Drive app folder
 */
export async function listAppGoogleDocs(accessToken: string): Promise<GoogleDocFile[]> {
  const folderId = await getOrCreateAppFolder(accessToken).catch(() => 'root');
  const query = folderId && folderId !== 'root'
    ? encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`)
    : encodeURIComponent(`mimeType = 'application/vnd.google-apps.document' and trashed = false`);
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || (res.statusText ? res.statusText : `HTTP ${res.status}`);
    throw new Error(`Không thể lấy danh sách Google Docs (${msg})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    ...f,
    webViewLink: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit`
  }));
}

/**
 * Reads Google Doc structure and extracts pure text for preview
 */
export async function getGoogleDocContent(accessToken: string, documentId: string): Promise<GoogleDocContent> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Không thể đọc tài liệu Google Doc (${res.statusText})`);
  }

  const doc = await res.json();
  let extractedText = '';

  if (doc.body?.content) {
    for (const elem of doc.body.content) {
      if (elem.paragraph?.elements) {
        for (const pElem of elem.paragraph.elements) {
          if (pElem.textRun?.content) {
            extractedText += pElem.textRun.content;
          }
        }
      } else if (elem.table?.tableRows) {
        for (const row of elem.table.tableRows) {
          const cellsText: string[] = [];
          for (const cell of row.tableCells || []) {
            let cellContent = '';
            for (const cellElem of cell.content || []) {
              if (cellElem.paragraph?.elements) {
                for (const pElem of cellElem.paragraph.elements) {
                  if (pElem.textRun?.content) {
                    cellContent += pElem.textRun.content.trim();
                  }
                }
              }
            }
            cellsText.push(cellContent);
          }
          extractedText += cellsText.join(' | ') + '\n';
        }
      }
    }
  }

  return {
    title: doc.title || 'Tài liệu không tên',
    documentId: doc.documentId,
    revisionId: doc.revisionId,
    bodyText: extractedText.trim()
  };
}

/**
 * Permanently or softly deletes a Google Doc file
 */
export async function deleteGoogleDoc(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Không thể xóa tệp Google Doc (${res.statusText})`);
  }
}

/**
 * Exports Inventory Report directly into a formatted Google Doc
 */
export async function exportInventoryReportToGoogleDoc(
  accessToken: string,
  items: InventoryItem[],
  options: {
    currentUsername?: string;
    categoryFilter?: string;
    searchQuery?: string;
    reportTitle?: string;
    reportDate?: string;
  } = {}
): Promise<{ documentId: string; webViewLink: string; title: string }> {
  const now = new Date();
  const dateStr = options.reportDate || now.toLocaleDateString('vi-VN');
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const username = options.currentUsername || 'Kỹ sư Quản lý Kho';
  const category = options.categoryFilter && options.categoryFilter !== 'ALL' ? options.categoryFilter : 'Tất cả chuyên mục';
  const docTitle = `Báo Cáo Tồn Kho CNS - ${dateStr.replace(/[\/\\]/g, '-')}`;

  const headerText = 
`TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM
CÔNG TY QUẢN LÝ BAY MIỀN NAM - TRUNG TÂM BẢO ĐẢM KỸ THUẬT
ĐỘI THÔNG TIN (CNS/ATM)

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------------------------------------------------
${(options.reportTitle || 'BÁO CÁO TỒN KHO & HIỆN TRẠNG TRANG THIẾT BỊ DỰ PHÒNG').toUpperCase()}
Thời điểm lập: ${dateStr} hồi ${timeStr}
Người lập báo cáo: ${username}
Phạm vi chuyên mục: ${category}
Tổng số trang thiết bị: ${items.length} thiết bị

DANH MỤC THIẾT BỊ TỒN KHO DỰ PHÒNG:
------------------------------------------------------------------------------------------------------------------------
STT | Kho | Tên Thiết Bị / Vật Tư | Part Number (P/N) | Serial Number (S/N) | Vị Trí | SL | Hiện Trạng | Ghi Chú
------------------------------------------------------------------------------------------------------------------------
`;

  const rowsText = items.map((item, idx) => {
    const status = item.auditStatus === 'OK' ? 'ĐỦ / TỐT' : (item.auditStatus === 'MISSING' ? 'HỎNG / THIẾU' : 'CHƯA KIỂM');
    return `${idx + 1}. | [${item.warehouse || 'KHO'}] | ${item.name} | PN: ${item.pn || '-'} | SN: ${item.sn || '-'} | Vị trí: ${item.loc || '-'} | SL: ${item.qty} | Trạng thái: ${status} | ${item.auditNote || ''}`;
  }).join('\n');

  const footerText = 
`\n------------------------------------------------------------------------------------------------------------------------
XÁC NHẬN CỦA CÁC BÊN LIÊN QUAN

    NGƯỜI LẬP BÁO CÁO                                              LÃNH ĐẠO ĐỘI THÔNG TIN
 (Ký, ghi rõ họ tên)                                                (Ký, ghi rõ họ tên)



   ${username}
`;

  const fullContent = headerText + rowsText + footerText;
  return await createBlankGoogleDoc(accessToken, docTitle, fullContent);
}

/**
 * Exports Handover Protocol (Biên bản bàn giao) into a formatted Google Doc
 */
export async function exportHandoverToGoogleDoc(
  accessToken: string,
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
): Promise<{ documentId: string; webViewLink: string; title: string }> {
  const docTitle = `Biên Bản Bàn Giao ${meta.handoverNo || 'CNS'} - Ngày ${meta.handoverDay || '..'}-${meta.handoverMonth || '..'}-${meta.handoverYear || '....'}`;

  const headerText = 
`TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM
CÔNG TY QUẢN LÝ BAY MIỀN NAM - TRUNG TÂM BẢO ĐẢM KỸ THUẬT
ĐỘI THÔNG TIN (CNS/ATM)

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------------------------------------------------
BIÊN BẢN BÀN GIAO TRANG THIẾT BỊ VẬT TƯ DỰ PHÒNG
Số: ${meta.handoverNo || '....../BBBG-ĐTT'}

Hôm nay, ngày ${meta.handoverDay || '...'} tháng ${meta.handoverMonth || '...'} năm ${meta.handoverYear || '......'}
Tại: ${meta.handoverLocation || 'Kho vật tư Đội Thông tin - Trung tâm BĐKT'}
Lý do bàn giao: ${meta.handoverReason || 'Cung cấp thay thế dự phòng & vận hành kỹ thuật'}

I. BÊN GIAO (BÊN A):
- Đơn vị / Bộ phận: ${meta.handoverGiverDept || 'Đội Thông tin - Trung tâm BĐKT'}
- Đại diện: Ông/Bà ${meta.handoverGiverName || '................................................'}
- Chức vụ: ${meta.handoverGiverPos || 'Kỹ sư quản lý kho'}

II. BÊN NHẬN (BÊN B):
- Đơn vị / Bộ phận: ${meta.handoverReceiverDept || '................................................'}
- Đại diện: Ông/Bà ${meta.handoverReceiverName || '................................................'}
- Chức vụ: ${meta.handoverReceiverPos || '................................................'}

III. NỘI DUNG BÀN GIAO:
Hai bên tiến hành giao nhận các trang thiết bị, vật tư dự phòng chi tiết như sau:
------------------------------------------------------------------------------------------------------------------------
STT | Tên Thiết Bị / Vật Tư | ĐVT | SL | Tình Trạng Kỹ Thuật | Đặc Điểm Thông Số | Serial Number | Ghi Chú
------------------------------------------------------------------------------------------------------------------------
`;

  const rowsText = rows.map((r, i) => 
    `${i + 1}. | ${r.name} | ${r.unit || 'Cái'} | ${r.qty} | ${r.quality || 'Tốt'} | ${r.specs || '-'} | SN: ${r.sn || '-'} | ${r.note || ''}`
  ).join('\n');

  const footerText = 
`\n------------------------------------------------------------------------------------------------------------------------
Biên bản được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản làm cơ sở theo dõi và quyết toán kỹ thuật.

            ĐẠI DIỆN BÊN GIAO                                            ĐẠI DIỆN BÊN NHẬN
           (Ký, ghi rõ họ tên)                                          (Ký, ghi rõ họ tên)




       ${meta.handoverGiverName || '................................'}               ${meta.handoverReceiverName || '................................'}
`;

  const fullContent = headerText + rowsText + footerText;
  return await createBlankGoogleDoc(accessToken, docTitle, fullContent);
}

/**
 * Exports Usage Slip into a formatted Google Doc
 */
export async function exportUsageSlipToGoogleDoc(
  accessToken: string,
  slip: UsageSlip
): Promise<{ documentId: string; webViewLink: string; title: string }> {
  const docTitle = `Phiếu Báo Sử Dụng - ${slip.itemName} (${slip.docNumber || 'PBSD'})`;

  const fullContent = 
`TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM
CÔNG TY QUẢN LÝ BAY MIỀN NAM - TRUNG TÂM BẢO ĐẢM KỸ THUẬT
ĐỘI THÔNG TIN (CNS/ATM)

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------------------------------------------------
PHIẾU BÁO SỬ DỤNG VẬT TƯ / THIẾT BỊ DỰ PHÒNG
Mã phiếu: ${slip.docNumber || 'PBSD-CNS'}
Thời gian ghi nhận: ${slip.date}

1. THÔNG TIN THIẾT BỊ / VẬT TƯ SỬ DỤNG:
- Tên thiết bị: ${slip.itemName}
- Mã Part Number (P/N): ${slip.pn || 'N/A'}
- Số Serial Number (S/N): ${slip.sn || 'N/A'}
- Chuyên mục: ${slip.category || 'Vật tư CNS'}
- Kho lưu trữ ban đầu: ${slip.warehouse || 'Kho Đội Thông tin'}
- Vị trí ban đầu: ${slip.originalLoc || 'N/A'}
- Số lượng xuất dùng: ${slip.qtyUsed} ${slip.unit || 'Chiếc'}

2. MỤC ĐÍCH & ĐỊA ĐIỂM SỬ DỤNG:
- Mục đích: ${slip.purpose || 'Thay thế bảo dưỡng định kỳ'}
- Vị trí lắp đặt / điều chuyển đến: ${slip.targetLocation || 'Hệ thống thiết bị tại đài trạm'}
- Ghi chú kỹ thuật: ${slip.notes || 'Không có'}

3. THÔNG TIN GIAO NHẬN:
- Người đề nghị / sử dụng: ${slip.user}
- Người cấp phát: ${slip.giverName || 'Kỹ sư quản lý kho'} (${slip.giverDept || 'Đội Thông tin'})
- Người tiếp nhận: ${slip.receiverName || slip.user} (${slip.receiverDept || 'Đơn vị khai thác'})

------------------------------------------------------------------------------------------------------------------------
   NGƯỜI ĐỀ NGHỊ / TIẾP NHẬN                                    NGƯỜI CẤP PHÁT VẬT TƯ
      (Ký, ghi rõ họ tên)                                         (Ký, ghi rõ họ tên)




    ${slip.user}                                                ${slip.giverName || 'Kỹ sư Quản lý Kho'}
`;

  return await createBlankGoogleDoc(accessToken, docTitle, fullContent);
}

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem, AuditStats, DispatchedRecord } from '../types.ts';

export type PrintLayoutType = 'NONE' | 'QR' | 'LABEL' | 'AUDIT_REPORT' | 'DISPATCH_REGISTRY' | 'DISPATCH_SINGLE_DOC';

interface PrintTemplatesProps {
  printLayout: PrintLayoutType;
  inventory: InventoryItem[];
  stats?: AuditStats;
  inspectorName?: string;
  auditDate?: string;
  auditLocation?: string;
  auditNote?: string;
  dispatchedRecords?: DispatchedRecord[];
  selectedDispatchedRecord?: DispatchedRecord | null;
}

export const PrintTemplates: React.FC<PrintTemplatesProps> = ({
  printLayout,
  inventory,
  stats,
  inspectorName = 'Kỹ sư trực ban Đội TT',
  auditDate = new Date().toLocaleDateString('vi-VN'),
  auditLocation = 'Kho Vật tư Dự phòng Đội Thông Tin - Trung tâm BĐKT',
  auditNote = 'Tất cả trang thiết bị được kiểm tra đối chiếu trực tiếp giữa hiện vật tại kho và dữ liệu mã định danh.',
  dispatchedRecords = [],
  selectedDispatchedRecord = null
}) => {
  if (printLayout === 'NONE') return null;

  const validQrItems = inventory.filter(item => item.warehouse || item.sn);
  const nowStr = auditDate || new Date().toLocaleDateString('vi-VN');
  const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const totalQty = inventory.reduce((sum, item) => sum + (item.qty || 0), 0);
  const okItems = inventory.filter(item => item.auditStatus === 'OK');
  const missingItems = inventory.filter(item => item.auditStatus === 'MISSING');
  const uncheckedItems = inventory.filter(item => !item.auditStatus);

  return (
    <div id="print-root-container" className="print-only">
      {/* ========================================================
          1. PRINT LAYOUT: BỘ MÃ QR CODE TRUY XUẤT ĐỊNH DANH 
         ======================================================== */}
      {printLayout === 'QR' && (
        <div className="print-page qr-page">
          <div className="print-header-simple">
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  CÔNG TY QUẢN LÝ BAY MIỀN NAM • TRUNG TÂM BĐKT
                </div>
                <h1 className="text-lg font-black uppercase text-black tracking-tight">
                  DANH SÁCH BẢNG MÃ QR ĐỊNH DANH VẬT TƯ DỰ PHÒNG
                </h1>
                <div className="text-xs text-slate-600">
                  Đội Thông Tin CNS/ATM • Tổng cộng: <strong>{validQrItems.length}</strong> mã thiết bị
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600 font-mono">
                <div>Ngày in: <strong>{nowStr}</strong></div>
                <div>Giờ: <strong>{nowTimeStr}</strong></div>
              </div>
            </div>
          </div>

          <div className="qr-print-grid">
            {validQrItems.map((item, idx) => (
              <div key={item.id || idx} className="qr-print-card">
                <div className="qr-code-wrapper">
                  <QRCodeSVG 
                    value={item.warehouse || item.sn} 
                    size={112} 
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="qr-code-id">
                  {item.warehouse || item.sn}
                </div>
                <div className="qr-item-name" title={item.name}>
                  {item.name}
                </div>
                <div className="qr-item-details">
                  {item.pn && <span>P/N: {item.pn} • </span>}
                  <span className="font-mono font-bold">S/N: {item.sn}</span>
                </div>
                {item.loc && (
                  <div className="qr-item-loc">
                    Vị trí: <strong>{item.loc}</strong> (SL: {item.qty})
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="print-footer-simple">
            <span>Hệ thống Quản lý Vật tư Dự phòng Đội Thông Tin CNS/ATM</span>
            <span>Trang in tự động</span>
          </div>
        </div>
      )}

      {/* ========================================================
          2. PRINT LAYOUT: TEM NHÃN THIẾT BỊ KỸ THUẬT (EQUIPMENT LABELS)
         ======================================================== */}
      {printLayout === 'LABEL' && (
        <div className="print-page label-page">
          <div className="label-print-grid">
            {inventory.map((item, idx) => (
              <div key={item.id || idx} className="label-print-card">
                {/* Header nhãn */}
                <div className="label-header">
                  <div className="label-org">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                  <div className="label-sub-org">ĐỘI THÔNG TIN - THIẾT BỊ DỰ PHÒNG</div>
                </div>

                {/* Body nhãn */}
                <div className="label-body">
                  <div className="label-info">
                    <div className="label-name">
                      {item.name}
                    </div>

                    <div className="label-props">
                      <div className="label-row">
                        <span className="label-lbl">Loại TB:</span>
                        <span className="label-val font-semibold">{item.category || 'Vật tư CNS'}</span>
                      </div>
                      <div className="label-row">
                        <span className="label-lbl">P/N:</span>
                        <span className="label-val">{item.pn || 'N/A'}</span>
                      </div>
                      <div className="label-row">
                        <span className="label-lbl">S/N:</span>
                        <span className="label-val font-mono font-bold">{item.sn}</span>
                      </div>
                      <div className="label-row">
                        <span className="label-lbl">Vị trí:</span>
                        <span className="label-val font-bold">{item.loc || 'Kho dự phòng'}</span>
                      </div>
                      <div className="label-row">
                        <span className="label-lbl">Số lượng:</span>
                        <span className="label-val font-bold">{item.qty} bộ/cái</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code trên nhãn */}
                  <div className="label-qr-side">
                    {item.warehouse || item.sn ? (
                      <div className="label-qr-box">
                        <QRCodeSVG 
                          value={item.warehouse || item.sn} 
                          size={76} 
                          level="M"
                        />
                        <div className="label-qr-code-text font-mono">
                          {item.warehouse || item.sn}
                        </div>
                      </div>
                    ) : (
                      <div className="label-no-qr">
                        NO QR
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer nhãn */}
                <div className="label-footer">
                  <span>Tem Quản Lý Tài Sản CNS • Ngày dán: {nowStr}</span>
                  <span className="font-bold">ĐỘI TT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          3. PRINT LAYOUT: BIÊN BẢN KIỂM KÊ VẬT TƯ CHUẨN FORM CHÍNH THỨC
         ======================================================== */}
      {printLayout === 'AUDIT_REPORT' && (
        <div className="print-page audit-report-page">
          {/* Quốc hiệu & Tên Đơn Vị */}
          <table className="audit-header-table">
            <tbody>
              <tr>
                <td className="company-col">
                  <div className="comp-name">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                  <div className="dept-name">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                  <div className="team-name"><u>ĐỘI THÔNG TIN</u></div>
                  <div className="doc-num">Số: ......./BB-ĐTT-KK</div>
                </td>
                <td className="national-col">
                  <div className="nat-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="nat-sub">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="nat-line">───────</div>
                  <div className="date-str">
                    TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tiêu đề biên bản */}
          <div className="audit-title-box">
            <h1 className="audit-main-title">
              BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ DỰ PHÒNG TẠI CHỖ
            </h1>
            <div className="audit-sub-title">
              (Phục vụ công tác bảo đảm kỹ thuật thông tin, dẫn đường, giám sát hàng không)
            </div>
          </div>

          {/* Thông tin mở đầu */}
          <div className="audit-intro-box">
            <p>
              Hôm nay, ngày <strong>{nowStr}</strong>, vào lúc <strong>{nowTimeStr}</strong>, tại: <strong>{auditLocation}</strong>.
            </p>
            <p>
              Tổ kiểm kê tiến hành kiểm kê thực tế toàn bộ trang thiết bị, vật tư dự phòng tại chỗ của Đội Thông Tin.
            </p>
            <div className="audit-members">
              <strong>Thành phần tham gia kiểm kê gồm có:</strong>
              <ul className="audit-member-list">
                <li>1. Ông/Bà: <strong>{inspectorName}</strong> - Kỹ sư trực ban / Đại diện Tổ Kiểm kê</li>
                <li>2. Ông/Bà: ................................................................ - Kỹ sư phụ trách kho vật tư</li>
                <li>3. Ông/Bà: ................................................................ - Đại diện Lãnh đạo Đội Thông Tin</li>
              </ul>
            </div>
          </div>

          {/* Bảng dữ liệu kiểm kê chi tiết */}
          <div className="audit-table-container">
            <div className="audit-table-title">I. KẾT QUẢ KIỂM KÊ CHI TIẾT TỪNG MÃ VẬT TƯ:</div>
            <table className="audit-data-table">
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>STT</th>
                  <th>Tên Trang Thiết Bị / Vật Tư</th>
                  <th style={{ width: '90px' }}>Phân Loại</th>
                  <th style={{ width: '100px' }}>P/N (Model)</th>
                  <th style={{ width: '110px' }}>Serial (S/N)</th>
                  <th style={{ width: '85px' }}>Mã Kho (QR)</th>
                  <th style={{ width: '85px' }}>Vị Trí Tủ</th>
                  <th style={{ width: '40px' }}>SL</th>
                  <th style={{ width: '85px' }}>Hiện Trạng</th>
                  <th>Ghi Chú Kiểm Kê</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="font-bold text-left">{item.name}</td>
                    <td className="text-center">{item.category}</td>
                    <td className="text-center font-mono">{item.pn || '-'}</td>
                    <td className="text-center font-mono font-bold">{item.sn}</td>
                    <td className="text-center font-mono font-bold text-indigo-900">{item.warehouse || '-'}</td>
                    <td className="text-center">{item.loc || '-'}</td>
                    <td className="text-center font-bold">{item.qty}</td>
                    <td className="text-center">
                      <span className={`status-badge ${
                        item.auditStatus === 'OK' ? 'status-ok' : (item.auditStatus === 'MISSING' ? 'status-missing' : 'status-none')
                      }`}>
                        {item.auditStatus === 'OK' ? 'ĐỦ / TỐT' : (item.auditStatus === 'MISSING' ? 'THIẾU/HỎNG' : 'CHƯA KIỂM')}
                      </span>
                    </td>
                    <td className="text-left text-xs italic">{item.auditNote || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phần Tổng Hợp & Đánh Giá */}
          <div className="audit-summary-box">
            <div className="audit-table-title">II. TỔNG HỢP VÀ KẾT LUẬN:</div>
            <div className="audit-summary-grid">
              <div className="audit-sum-col">
                <p>• Tổng số danh mục thiết bị kiểm kê: <strong>{inventory.length}</strong> mã</p>
                <p>• Tổng số lượng cá thể hiện vật: <strong>{totalQty}</strong> bộ/chiếc</p>
                <p>• Số thiết bị kiểm đạt (ĐỦ / TỐT): <strong className="text-emerald-700">{okItems.length}</strong> mã</p>
              </div>
              <div className="audit-sum-col">
                <p>• Số thiết bị sai lệch (THIẾU / HỎNG): <strong className="text-rose-700">{missingItems.length}</strong> mã</p>
                <p>• Số thiết bị chưa đối soát: <strong>{uncheckedItems.length}</strong> mã</p>
                <p>• Tỷ lệ sẵn sàng khai thác: <strong>{inventory.length > 0 ? Math.round((okItems.length / inventory.length) * 100) : 0}%</strong></p>
              </div>
            </div>
            <div className="audit-note-line">
              <strong>Đánh giá chung:</strong> <span>{auditNote}</span>
            </div>
          </div>

          {/* Bảng chữ ký */}
          <table className="audit-signatures-table">
            <tbody>
              <tr>
                <td style={{ width: '33.3%' }}>
                  <div className="sig-header">ĐẠI DIỆN TỔ KIỂM KÊ</div>
                  <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">{inspectorName}</div>
                </td>
                <td style={{ width: '33.3%' }}>
                  <div className="sig-header">TRƯỞNG CA TRỰC BĐKT</div>
                  <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">...................................................</div>
                </td>
                <td style={{ width: '33.3%' }}>
                  <div className="sig-header">ĐỘI TRƯỞNG ĐỘI THÔNG TIN</div>
                  <div className="sig-sub">(Ký, đóng dấu xác nhận)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">...................................................</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          4. PRINT LAYOUT: SỔ TỔNG HỢP THEO DÕI BÀN GIAO & SỬ DỤNG
         ======================================================== */}
      {printLayout === 'DISPATCH_REGISTRY' && (
        <div className="print-page audit-page">
          <table className="audit-national-header">
            <tbody>
              <tr>
                <td className="audit-header-left" style={{ width: '45%' }}>
                  <div className="audit-org-parent">TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM</div>
                  <div className="audit-org-child">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                  <div className="audit-org-dept">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                  <div className="audit-org-sub">ĐỘI THÔNG TIN CNS/ATM</div>
                </td>
                <td className="audit-header-right" style={{ width: '55%' }}>
                  <div className="audit-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="audit-motto-desc">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="audit-doc-place">TP. Hồ Chí Minh, ngày {nowStr}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="audit-title-box">
            <h1 className="audit-main-title">
              SỔ THEO DÕI TRANG THIẾT BỊ ĐÃ BÀN GIAO VÀ ĐƯA VÀO SỬ DỤNG
            </h1>
            <div className="audit-sub-title">
              (Tổng hợp toàn bộ Phiếu Báo Sử Dụng & Biên Bản Bàn Giao Kỹ Thuật Đội Thông Tin)
            </div>
          </div>

          <div className="audit-intro-box">
            <p>
              Tính đến ngày: <strong>{nowStr}</strong>. Tổng số lượng hồ sơ luân chuyển ghi nhận: <strong>{dispatchedRecords.length}</strong> bản ghi.
            </p>
            <p>
              Mục đích: Theo dõi vị trí lắp đặt, tình trạng vận hành và quản lý tài sản trang thiết bị ngoài kho dự phòng tại chỗ.
            </p>
          </div>

          <div className="audit-table-container">
            <table className="audit-data-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>STT</th>
                  <th style={{ width: '90px' }}>Số Hồ Sơ / Loại</th>
                  <th>Tên Trang Thiết Bị</th>
                  <th style={{ width: '90px' }}>Serial (S/N)</th>
                  <th style={{ width: '45px' }}>SL</th>
                  <th style={{ width: '130px' }}>Kỹ Sư / Đơn Vị Nhận</th>
                  <th style={{ width: '150px' }}>Vị Trí Lắp Đặt / Hệ Thống</th>
                  <th style={{ width: '75px' }}>Ngày Xuất</th>
                  <th style={{ width: '85px' }}>Hiện Trạng</th>
                </tr>
              </thead>
              <tbody>
                {dispatchedRecords.map((r, idx) => (
                  <tr key={r.id || idx}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="text-center">
                      <div className="font-mono font-bold text-xs">{r.docNumber || `#${r.id.slice(-5)}`}</div>
                      <div className="text-[9px] text-slate-500">{r.type === 'HANDOVER_DOC' ? 'Biên bản BG' : 'Phiếu sử dụng'}</div>
                    </td>
                    <td className="font-bold text-left">{r.itemName}</td>
                    <td className="text-center font-mono font-bold">{r.sn}</td>
                    <td className="text-center font-bold">{r.qty}</td>
                    <td className="text-left">
                      <div className="font-bold">{r.receiverName}</div>
                      {r.receiverDept && <div className="text-[9.5px] text-slate-500">{r.receiverDept}</div>}
                    </td>
                    <td className="text-left text-xs">
                      <div><strong>{r.targetLocation}</strong></div>
                      <div className="italic text-[9.5px] text-slate-500">{r.purpose}</div>
                    </td>
                    <td className="text-center font-mono text-[10px]">{r.date.split(' ')[0]}</td>
                    <td className="text-center">
                      <span className={`status-badge ${r.status === 'DEPLOYED' ? 'status-ok' : 'status-none'}`}>
                        {r.status === 'DEPLOYED' ? 'ĐANG DÙNG' : 'ĐÃ HOÀN KHO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <table className="audit-signatures-table mt-6">
            <tbody>
              <tr>
                <td style={{ width: '33.3%' }}>
                  <div className="sig-header">NGƯỜI LẬP SỔ THEO DÕI</div>
                  <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">{inspectorName}</div>
                </td>
                <td style={{ width: '33.3%' }}>
                  <div className="sig-header">PHỤ TRÁCH KHO VẬT TƯ</div>
                  <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">...................................................</div>
                </td>
                <td style={{ width: '33.3%' }}>
                  <div className="sig-header">ĐỘI TRƯỞNG ĐỘI THÔNG TIN</div>
                  <div className="sig-sub">(Ký, đóng dấu xác nhận)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">...................................................</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          5. PRINT LAYOUT: IN ĐƠN LẺ PHIẾU BÁO SỬ DỤNG / BÀN GIAO
         ======================================================== */}
      {printLayout === 'DISPATCH_SINGLE_DOC' && selectedDispatchedRecord && (
        <div className="print-page audit-page">
          <table className="audit-national-header">
            <tbody>
              <tr>
                <td className="audit-header-left" style={{ width: '45%' }}>
                  <div className="audit-org-parent">TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM</div>
                  <div className="audit-org-child">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                  <div className="audit-org-dept">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                  <div className="audit-org-sub">ĐỘI THÔNG TIN CNS/ATM</div>
                </td>
                <td className="audit-header-right" style={{ width: '55%' }}>
                  <div className="audit-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="audit-motto-desc">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="audit-doc-place">TP. Hồ Chí Minh, ngày {selectedDispatchedRecord.date}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="audit-title-box">
            <h1 className="audit-main-title">
              {selectedDispatchedRecord.type === 'HANDOVER_DOC' ? 'BIÊN BẢN BÀN GIAO THIẾT BỊ KỸ THUẬT' : 'PHIẾU BÁO SỬ DỤNG THIẾT BỊ VẬT TƯ DỰ PHÒNG'}
            </h1>
            <div className="audit-sub-title">
              Số hiệu: <strong>{selectedDispatchedRecord.docNumber || `#${selectedDispatchedRecord.id.slice(-6)}`}</strong>
            </div>
          </div>

          <div className="audit-intro-box">
            <p><strong>1. THÔNG TIN BÊN GIAO (ĐƠN VỊ CẤP XUẤT):</strong></p>
            <p>• Đơn vị: <strong>{selectedDispatchedRecord.giverDept || 'Đội Thông Tin – Trung tâm Bảo đảm Kỹ thuật'}</strong></p>
            <p>• Đại diện: <strong>{selectedDispatchedRecord.giverName || 'Admin / Kỹ sư trực ban'}</strong> {selectedDispatchedRecord.giverPos && `(Chức vụ: ${selectedDispatchedRecord.giverPos})`}</p>
            
            <p className="mt-2"><strong>2. THÔNG TIN BÊN NHẬN (ĐƠN VỊ TIẾP NHẬN SỬ DỤNG):</strong></p>
            <p>• Đơn vị: <strong>{selectedDispatchedRecord.receiverDept || 'Tổ Kỹ Thuật Tiếp Nhận Khai Thác'}</strong></p>
            <p>• Kỹ sư tiếp nhận: <strong>{selectedDispatchedRecord.receiverName}</strong> {selectedDispatchedRecord.receiverPos && `(Chức vụ: ${selectedDispatchedRecord.receiverPos})`}</p>
          </div>

          <div className="audit-table-container">
            <div className="audit-table-title">3. DANH MỤC THIẾT BỊ KỸ THUẬT BÀN GIAO / SỬ DỤNG:</div>
            <table className="audit-data-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th>Tên Thiết Bị / Module Kỹ Thuật</th>
                  <th style={{ width: '100px' }}>Chủng Loại</th>
                  <th style={{ width: '110px' }}>Part Number</th>
                  <th style={{ width: '120px' }}>Serial Number</th>
                  <th style={{ width: '50px' }}>SL</th>
                  <th>Vị Trí Lắp Đặt Mới</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center font-bold">1</td>
                  <td className="font-bold text-left">{selectedDispatchedRecord.itemName}</td>
                  <td className="text-center">{selectedDispatchedRecord.category}</td>
                  <td className="text-center font-mono">{selectedDispatchedRecord.pn || '-'}</td>
                  <td className="text-center font-mono font-bold">{selectedDispatchedRecord.sn}</td>
                  <td className="text-center font-bold text-sm">{selectedDispatchedRecord.qty} {selectedDispatchedRecord.unit || 'bộ'}</td>
                  <td className="text-left font-bold">{selectedDispatchedRecord.targetLocation}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="audit-summary-box">
            <div className="audit-table-title">4. MỤC ĐÍCH SỬ DỤNG & GHI CHÚ KỸ THUẬT:</div>
            <p className="text-xs">
              • <strong>Mục đích / Lý do:</strong> {selectedDispatchedRecord.purpose}
            </p>
            {selectedDispatchedRecord.notes && (
              <p className="text-xs mt-1">
                • <strong>Ghi chú kỹ thuật:</strong> {selectedDispatchedRecord.notes}
              </p>
            )}
            <p className="text-xs mt-1">
              • <strong>Cam kết:</strong> Bên nhận cam kết quản lý, vận hành thiết bị đúng quy trình kỹ thuật hàng không và chịu trách nhiệm bảo quản tài sản được giao.
            </p>
          </div>

          <table className="audit-signatures-table mt-6">
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="sig-header">ĐẠI DIỆN BÊN GIAO</div>
                  <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">{selectedDispatchedRecord.giverName || inspectorName}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div className="sig-header">ĐẠI DIỆN BÊN NHẬN</div>
                  <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                  <div className="sig-space"></div>
                  <div className="sig-name">{selectedDispatchedRecord.receiverName}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import { InventoryItem, DispatchedRecord, SystemAuditLogEntry } from './types.ts';
import imgVhf from './assets/images/vhf_transceiver_rack_1787736640747.jpg';
import imgVccs from './assets/images/vccs_switch_module_1787736655148.jpg';
import imgGps from './assets/images/gps_ntp_server_1787736673535.jpg';
import imgRadar from './assets/images/cns_radar_antenna_1787737065985.jpg';
import imgRecorder from './assets/images/atc_voice_recorder_1787737082216.jpg';
import imgUps from './assets/images/cns_power_ups_1787737096058.jpg';
import imgSwitch from './assets/images/cns_cisco_switch_1787737110906.jpg';

export {
  imgVhf,
  imgVccs,
  imgGps,
  imgRadar,
  imgRecorder,
  imgUps,
  imgSwitch,
};

export const STOCK_CNS_ILLUSTRATIONS = [
  {
    id: 'vhf',
    label: 'Máy phát/thu VHF AM (Jotron / R&S)',
    category: 'VHF AM',
    image: imgVhf,
  },
  {
    id: 'vccs',
    label: 'Card chuyển mạch thoại VCCS (Frequentis)',
    category: 'VCCS',
    image: imgVccs,
  },
  {
    id: 'gps',
    label: 'Máy chủ thời gian GPS Time Server (Meinberg)',
    category: 'GPS & Ăng-ten',
    image: imgGps,
  },
  {
    id: 'radar',
    label: 'Hệ thống Radar & Ăng-ten giám sát ATM',
    category: 'Radar & Giám sát',
    image: imgRadar,
  },
  {
    id: 'recorder',
    label: 'Hệ thống ghi âm thoại & dữ liệu bay (NiceLog)',
    category: 'Ghi âm & Lưu trữ',
    image: imgRecorder,
  },
  {
    id: 'ups',
    label: 'Hệ thống nguồn UPS & Chỉnh lưu 48V DC',
    category: 'Nguồn & UPS',
    image: imgUps,
  },
  {
    id: 'switch',
    label: 'Router / Switch quang chuyên dụng CNS',
    category: 'Mạng & Truyền dẫn',
    image: imgSwitch,
  },
];

export const getCategoryStockIllustration = (name: string, category?: string): string => {
  const query = `${name} ${category || ''}`.toLowerCase();
  if (query.includes('radar') || query.includes('giám sát') || query.includes('ssr') || query.includes('psr')) {
    return imgRadar;
  }
  if (query.includes('ghi âm') || query.includes('recorder') || query.includes('lưu trữ') || query.includes('nices')) {
    return imgRecorder;
  }
  if (query.includes('nguồn') || query.includes('ups') || query.includes('pin') || query.includes('ắc quy') || query.includes('rectifier')) {
    return imgUps;
  }
  if (query.includes('vccs') || query.includes('thoại') || query.includes('sitti') || query.includes('card') || query.includes('voice')) {
    return imgVccs;
  }
  if (query.includes('gps') || query.includes('thời gian') || query.includes('time server') || query.includes('ăng-ten') || query.includes('antenna')) {
    return imgGps;
  }
  if (query.includes('switch') || query.includes('router') || query.includes('quang') || query.includes('mạng') || query.includes('cisco')) {
    return imgSwitch;
  }
  return imgVhf;
};

export const CATEGORIES: string[] = [
  'Tất cả loại',
  'MP2100 & MP4100',
  'KLM2100',
  'OCM',
  'VHF AM',
  'VCCS',
  'Mạng & Truyền dẫn',
  'GPS & Ăng-ten',
  'Ghi âm & Lưu trữ',
  'Nguồn & UPS',
  'Khác'
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1779873200226',
    name: 'CARD DỮ LIỆU VS/6S/4E&M',
    pn: 'MP-4100M-VS/6S/4E&M/UTP',
    sn: '2428000981',
    warehouse: 'MN-DHB-TBK-1071',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'MISSING',
    auditDate: '00:22:08 3/9/2026',
    auditNote: 'Quét mã xác nhận Đủ',
    category: 'MP2100 & MP4100',
    imageUrl: imgVccs,
    history: [
      { id: 'h-1788369728263-0', status: 'MISSING', date: '00:22:08 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369710525-0', status: 'OK', date: '00:21:50 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369709203-0', status: 'OK', date: '00:21:49 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369701315-0', status: 'OK', date: '00:21:41 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369700581-0', status: 'OK', date: '00:21:40 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369699868-0', status: 'OK', date: '00:21:39 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369699108-0', status: 'OK', date: '00:21:39 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369698392-0', status: 'OK', date: '00:21:38 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788049073919', status: 'OK', date: '07:17:53 30/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' },
      { id: 'h-1787737161586-0', status: 'MISSING', date: '16:39:21 26/8/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1787734813353', status: 'OK', date: '16:00:13 26/8/2026', note: 'Lắp đặt sử dụng x1 chiếc tại: tạ (Người nhận: Nguyễn Trong A)', user: 'admin' },
      { id: 'h-1787731090138-0', status: 'OK', date: '14:58:10 26/8/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' }
    ]
  },
  {
    id: 'item-1779873306704',
    name: 'CARD TRUNG KẾ E1',
    pn: 'MP-4100M-VS/6S/8E1T1/UTP',
    sn: '2428000980',
    warehouse: 'MN-DHB-TBK-1070',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'MISSING',
    auditDate: '00:22:47 3/9/2026',
    auditNote: 'Quét mã xác nhận Đủ',
    category: 'MP2100 & MP4100',
    imageUrl: imgVccs,
    history: [
      { id: 'h-1788369767164-1', status: 'MISSING', date: '00:22:47 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788369755547-1', status: 'MISSING', date: '00:22:35 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788049105548', status: 'OK', date: '07:18:25 30/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' },
      { id: 'h-1787732391611-1', status: 'OK', date: '15:19:51 26/8/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1787732389286-1', status: 'OK', date: '15:19:49 26/8/2026', note: 'Vât tư 123456', user: 'admin' }
    ]
  },
  {
    id: 'item-1779873408159',
    name: 'CARD XỬ LÝ DỮ LIỆU (MP4100)',
    pn: 'MP-4100M-CL.2/GBEAUTP',
    sn: '2428000979',
    warehouse: 'MN-DHB-TBK-1072',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '00:33:09 3/9/2026',
    auditNote: 'Quét mã xác nhận Đủ',
    category: 'MP2100 & MP4100',
    imageUrl: imgSwitch,
    history: [
      { id: 'h-1788370389764-2', status: 'OK', date: '00:33:09 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788370386850-2', status: 'OK', date: '00:33:06 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788370341465-2', status: 'MISSING', date: '00:32:21 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788048975342-2', status: 'OK', date: '07:16:15 30/8/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' }
    ]
  },
  {
    id: 'item-1779873511577',
    name: 'CARD THOẠI 2W FXO, 4 KÊNH/CARD',
    pn: 'MP-2100M-VC-4A/FXO',
    sn: '1951002140 1951002141',
    warehouse: 'MN-DHB-TBK-0743',
    loc: 'TỦ 2- VTDP',
    qty: 2,
    auditStatus: 'MISSING',
    auditDate: '00:22:30 3/9/2026',
    auditNote: 'Quét mã xác nhận Đủ',
    category: 'MP2100 & MP4100',
    imageUrl: imgVccs,
    history: [
      { id: 'h-1788369750278-3', status: 'MISSING', date: '00:22:30 3/9/2026', note: 'Kiểm kê tự động bằng hệ thống quét QR', user: 'admin' },
      { id: 'h-1788049110530', status: 'OK', date: '07:18:30 30/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1779873733210',
    name: 'Card Trung kế V.35',
    pn: 'Đang cập nhật',
    sn: '10022783',
    warehouse: 'MN-DHB-TBK-0197',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'OCM',
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: 'item-1779874050273',
    name: 'Card V.35 Main Link module KM-2100M-KML.1/ N8',
    pn: 'KM-2100M-KML.1/N8',
    sn: '2130003593',
    warehouse: 'MN-DHB-TBK-0198',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'KLM2100',
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: 'item-1779874132339',
    name: 'Card Low Speed Module RS232 KM-2100M-KLS.1/N8',
    pn: 'KM-2100M-KLS.1/N',
    sn: '1707003336',
    warehouse: 'MN-DHB-TBK-0176',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '15:53:54 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'KLM2100',
    imageUrl: imgSwitch,
    history: [
      { id: 'h-1787734434189', status: 'OK', date: '15:53:54 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1779874213055',
    name: 'Card FXO',
    pn: 'KM-2000M-KVF4/FXO',
    sn: '1709002492',
    warehouse: 'MN-DHB-TBK-0172',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '15:53:52 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'KLM2100',
    imageUrl: imgVccs,
    history: [
      { id: 'h-1787734432920', status: 'OK', date: '15:53:52 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1779874270966',
    name: 'Card FXS',
    pn: 'KM-2000M-KVF4/FXS',
    sn: '1709002488',
    warehouse: 'MN-DHB-TBK-0171',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '15:53:51 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'KLM2100',
    imageUrl: imgVccs,
    history: [
      { id: 'h-1787734431647', status: 'OK', date: '15:53:51 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1779874323740',
    name: 'Card 2 Channel PCM/ADPCM KM-2100M-KVC.1M/EC/E&M',
    pn: 'KM-2100M-KVC.1M/EC/E&M',
    sn: '1602000557',
    warehouse: 'MN-DHB-TBK-0154',
    loc: 'TỦ 2- VTDP',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '15:53:50 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'KLM2100',
    imageUrl: imgVccs,
    history: [
      { id: 'h-1787734430445', status: 'OK', date: '15:53:50 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1780838524884',
    name: 'card sử lý trong khối Ectier',
    pn: '',
    sn: '828',
    warehouse: 'MN-DHB-HFA-0003',
    loc: 'MN-DHB-HFA-0026Đã giao về kho ACC Ngày 11/02/2026',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '15:53:48 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'Khác',
    imageUrl: imgSwitch,
    history: [
      { id: 'h-1787734428579', status: 'OK', date: '15:53:48 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1780839235189',
    name: 'Khối công suất',
    pn: '',
    sn: '547',
    warehouse: 'MN-DHB-HFA-0007',
    loc: 'Đã giao về kho ACC Ngày 11/02/2026',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '15:53:55 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'VHF AM',
    imageUrl: imgVhf,
    history: [
      { id: 'h-1787734435805', status: 'OK', date: '15:53:55 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1780839362027',
    name: 'Modem ATRIE',
    pn: '',
    sn: 'Đang cập nhật',
    warehouse: 'MN-DHB-HFA-0012',
    loc: 'Đã giao về kho ACC Ngày 11/02/2026',
    qty: 2,
    auditStatus: 'OK',
    auditDate: '15:53:56 26/8/2026',
    auditNote: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
    category: 'VHF AM',
    imageUrl: imgSwitch,
    history: [
      { id: 'h-1787734436936', status: 'OK', date: '15:53:56 26/8/2026', note: 'Kiểm bằng nhấp chọn nhanh trên danh sách', user: 'admin' }
    ]
  },
  {
    id: 'item-1780839421635',
    name: 'Receiver multi couple dải tần HF GTA5030.4',
    pn: '',
    sn: '26549',
    warehouse: 'MN-DHB-HFA-0013',
    loc: 'Đã giao về kho ACC Ngày 11/02/2026',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'VHF AM',
    imageUrl: imgVhf,
    history: []
  },
  {
    id: 'item-1787654552908',
    name: 'Test',
    pn: 'xsda',
    sn: 'đs',
    warehouse: 'DẤ',
    loc: 'sdaa',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'VCCS',
    imageUrl: imgVccs,
    history: []
  },
  {
    id: 'item-1787730343194',
    name: 'MUX',
    pn: 'AD1234',
    sn: '1234567',
    warehouse: 'QƯ12233',
    loc: '',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'VHF AM',
    imageUrl: imgVhf,
    history: []
  },
  {
    id: 'item-1787878266038',
    name: 'Modem Vệ tinh',
    pn: '',
    sn: '12345',
    warehouse: 'MN-DHB-TBK-0043',
    loc: 'test',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'Khác',
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: 'item-1787880336657',
    name: 'BUC Band công suất 25W',
    pn: 'ALTX-CX-25',
    sn: 'B12791',
    warehouse: 'MN-DHB-TBK-1136',
    loc: 'Đã bàn giao rada CMU 08/2026',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '08:27:20 28/8/2026',
    auditNote: 'Xuất sử dụng x1 bộ tại: Bàn Giao Radar CMU (Người nhận: Lê Công Quan Nhựt)',
    category: 'Khác',
    imageUrl: imgRadar,
    history: [
      { id: 'h-use-1787880440241', status: 'OK', date: '08:27:20 28/8/2026', note: 'Xuất sử dụng x1 bộ tại: Bàn Giao Radar CMU (Người nhận: Lê Công Quan Nhựt)', user: 'admin' }
    ]
  },
  {
    id: 'item-1788152544875',
    name: 'Card điều khiển',
    pn: '',
    sn: '17909002474/3',
    warehouse: 'MN-DHB-TBK-0152',
    loc: 'Tủ 2- Ngăn 3- VTDP đội TT',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'Mạng & Truyền dẫn',
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: 'item-1788152659220',
    name: 'Card CCM -10',
    pn: '',
    sn: '10813733',
    warehouse: 'MN-DHB-TBK-0159',
    loc: 'Tủ 2- Ngăn 3 -VTDP đội TT',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'VHF AM',
    imageUrl: imgVhf,
    history: []
  },
  {
    id: 'item-1788152733930',
    name: 'Card FXO',
    pn: '',
    sn: 'Test',
    warehouse: '',
    loc: 'Tủ 2-Ngăn 2-VTDP đội Tt',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'Mạng & Truyền dẫn',
    imageUrl: imgVccs,
    history: []
  }
];

export const INITIAL_DISPATCHED_RECORDS: DispatchedRecord[] = [
  {
    id: 'disp-01',
    type: 'USAGE_SLIP',
    docNumber: 'PB-2026/088',
    itemId: 'cns-08',
    itemName: 'Module nguồn dự phòng Hot-Swap Rohde & Schwarz Series 4200',
    category: 'Nguồn & UPS',
    sn: 'RS2024-55102',
    pn: 'RS4200-PSU-48V',
    qty: 1,
    unit: 'Module',
    date: '25/08/2026 16:00',
    warehouse: 'KHO-PWR-01',
    originalLoc: 'Tủ D1 - Ngăn 2',
    receiverName: 'KS. Nguyễn Tuấn Vũ',
    targetLocation: 'Trạm Đài Phụ Cận Tân Sơn Nhất (Phòng nguồn VHF)',
    purpose: 'Thay thế dự phòng khẩn cấp do nguồn cũ bị sụt áp',
    notes: 'Đã căn chỉnh điện áp đầu ra chuẩn 48V DC, hệ thống hoạt động ổn định.',
    status: 'DEPLOYED'
  },
  {
    id: 'disp-02',
    type: 'HANDOVER_DOC',
    docNumber: '104/KT-BG',
    itemId: 'cns-01',
    itemName: 'Khối máy phát VHF AM Jotron TA-7650',
    category: 'VHF AM',
    sn: 'JT2024-88410-X',
    pn: 'TA-7650-50W',
    qty: 1,
    unit: 'Bộ',
    date: '22/08/2026',
    warehouse: 'KHO-VHF-01',
    originalLoc: 'Tủ A1 - Ngăn 1',
    giverDept: 'Đội Thông Tin – Trung tâm BĐKT',
    giverName: 'Nguyễn Văn Khải',
    giverPos: 'Đội trưởng',
    receiverDept: 'Tổ Kỹ thuật Không lưu - Đài KSV TACC',
    receiverName: 'Trần Quốc Toản',
    receiverPos: 'Kỹ sư trực ban',
    targetLocation: 'Phòng Máy Phát Đài Kiểm Soát Tiếp Cận (TACC)',
    purpose: 'Bàn giao tài sản, công cụ kỹ thuật đảm bảo khai thác tần số điều hành bay 120.1MHz',
    notes: 'Thiết bị mới 100%, kèm đầy đủ module điều khiển và chứng nhận xuất xưởng.',
    status: 'DEPLOYED'
  },
  {
    id: 'disp-03',
    type: 'USAGE_SLIP',
    docNumber: 'PB-2026/075',
    itemId: 'cns-04',
    itemName: 'Card giao diện thoại VCCS Sitti M600 Interface Board',
    category: 'VCCS',
    sn: 'ST2023-44109',
    pn: 'M600-IFB-4E1',
    qty: 1,
    unit: 'Card',
    date: '18/08/2026 14:15',
    warehouse: 'KHO-VCCS-02',
    originalLoc: 'Tủ B2 - Ngăn 1',
    receiverName: 'KS. Lê Hoàng Long',
    targetLocation: 'Phòng Máy Chủ VCCS Trung tâm ACC Hồ Chí Minh',
    purpose: 'Bảo dưỡng định kỳ / Thay thế dự phòng',
    notes: 'Kiểm tra truyền thông 4E1 thoại chuyển mạch không phát sinh lỗi CRC.',
    status: 'DEPLOYED'
  },
  {
    id: 'disp-04',
    type: 'HANDOVER_DOC',
    docNumber: '098/KT-BG',
    itemName: 'Thiết bị chuyển mạch quang Cisco Catalyst 2960-X 24 Port Gigabit',
    category: 'Mạng & Truyền dẫn',
    sn: 'CS2023-99104',
    pn: 'WS-C2960X-24TD-L',
    qty: 2,
    unit: 'Chiếc',
    date: '10/08/2026',
    warehouse: 'KHO-NET-01',
    giverDept: 'Đội Thông Tin – Trung tâm BĐKT',
    giverName: 'Nguyễn Văn Khải',
    giverPos: 'Đội trưởng',
    receiverDept: 'Trạm Thông Tin Vệ Tinh Mặt Đất VSAT',
    receiverName: 'Phạm Minh Đức',
    receiverPos: 'Trưởng trạm',
    targetLocation: 'Rack mạng Truyền dẫn số liệu VSAT',
    purpose: 'Trang bị mở rộng hệ thống mạng LAN truyền số liệu khí tượng và dữ liệu bay AFTN',
    notes: 'Bàn giao kèm 4 module quang SFP 1Gbps và dây nguồn chuẩn C13.',
    status: 'DEPLOYED'
  },
  {
    id: 'disp-05',
    type: 'USAGE_SLIP',
    docNumber: 'PB-2026/062',
    itemId: 'cns-06',
    itemName: 'Bộ chia tín hiệu RF Cavity Filter VHF 118-137MHz',
    category: 'VHF AM',
    sn: 'FL2022-00823',
    pn: 'BPF-118137-4C',
    qty: 1,
    unit: 'Bộ',
    date: '02/08/2026 09:30',
    warehouse: 'KHO-RF-01',
    originalLoc: 'Tủ A2 - Ngăn 3',
    receiverName: 'KS. Đặng Việt Cường',
    targetLocation: 'Phòng Thí Nghiệm & Hiệu Chuẩn Lab CNS',
    purpose: 'Đo đạc kiểm thử phòng Lab kỹ thuật',
    notes: 'Đã hoàn thành kiểm chuẩn hệ số sóng đứng VSWR < 1.15 và thu hồi nhập lại kho.',
    status: 'RETURNED',
    returnedDate: '05/08/2026 15:30',
    returnedBy: 'KS. Đặng Việt Cường',
    returnedQty: 1,
    returnNote: 'Thiết bị hoạt động hoàn hảo sau kiểm thử, đã niêm phong lưu kho.'
  }
];

export const INITIAL_SYSTEM_AUDIT_LOGS: SystemAuditLogEntry[] = [
  {
    id: 'log-101',
    timestamp: '29/08/2026 11:20:15',
    actionType: 'USAGE_DISPATCH',
    actionTitle: 'Xuất phiếu báo sử dụng thiết bị',
    performedBy: 'admin',
    performedByName: 'KS. Nguyễn Văn Khải',
    userRole: 'admin',
    targetId: 'cns-01',
    targetName: 'Khối máy phát VHF AM Jotron TA-7650',
    targetCategory: 'VHF AM',
    targetSN: 'JT2024-88410',
    details: 'Đăng ký xuất x1 Bộ theo Phiếu Báo số PB-2026/089 cho KS. Lê Hoàng Long. Vị trí lắp đặt: Đài Kiểm Soát Tiếp Cận TACC.',
    prevData: 'Tồn kho: 3 Bộ',
    newData: 'Tồn kho: 2 Bộ (Đã trừ 1)',
    ipAddress: '192.168.1.45 (Máy Trạm Kỹ Thuật Đội Thông Tin)'
  },
  {
    id: 'log-102',
    timestamp: '28/08/2026 15:40:22',
    actionType: 'HANDOVER_CREATE',
    actionTitle: 'Lập biên bản bàn giao thiết bị',
    performedBy: 'admin',
    performedByName: 'KS. Nguyễn Văn Khải',
    userRole: 'admin',
    targetId: 'disp-02',
    targetName: 'Máy phát/thu VHF AM R&S Series 4200 (Biên bản 112/KT-BG)',
    targetCategory: 'VHF AM',
    targetSN: 'RS2023-55912',
    details: 'Bàn giao x1 Bộ cho Tổ Kỹ thuật Không lưu - Đài KSV TACC (Đại diện: Trần Quốc Toản). Lý do: Đảm bảo tần số 120.1MHz.',
    ipAddress: '192.168.1.45 (Trạm Kỹ Thuật TACC)'
  },
  {
    id: 'log-103',
    timestamp: '26/08/2026 08:45:10',
    actionType: 'INVENTORY_AUDIT',
    actionTitle: 'Kiểm kê định kỳ & quét mã QR',
    performedBy: 'guest',
    performedByName: 'Kỹ sư Kiểm kê',
    userRole: 'guest',
    targetId: 'cns-02',
    targetName: 'Khối máy thu VHF AM Jotron RA-7203',
    targetCategory: 'VHF AM',
    targetSN: 'JT2024-77312',
    details: 'Xác nhận trạng thái OK sau khi quét tem QR tại Tủ A1 - Ngăn 2. Ghi chú: Độ nhạy thu tốt, Squelch hoạt động chuẩn.',
    prevData: 'Trạng thái: Chưa kiểm',
    newData: 'Trạng thái: ĐẠT CHUẨN (OK)',
    ipAddress: '192.168.1.88 (Mobile App Barcode Scanner)'
  },
  {
    id: 'log-104',
    timestamp: '25/08/2026 14:15:30',
    actionType: 'ITEM_UPDATE',
    actionTitle: 'Cập nhật thông số kỹ thuật thiết bị',
    performedBy: 'admin',
    performedByName: 'KS. Nguyễn Văn Khải',
    userRole: 'admin',
    targetId: 'cns-03',
    targetName: 'Bộ chuyển mạch thoại VCCS Frequentis VCS3020X Card IP',
    targetCategory: 'VCCS',
    targetSN: 'FQ-8921-0044',
    details: 'Cập nhật vị trí lưu kho: Chuyển từ "Kệ tạm" sang "Tủ B2 - Ngăn 3". Bổ sung mã P/N: VCS3020X-IPB.',
    prevData: 'Vị trí: Kệ tạm | P/N: N/A',
    newData: 'Vị trí: Tủ B2 - Ngăn 3 | P/N: VCS3020X-IPB',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log-105',
    timestamp: '22/08/2026 09:10:05',
    actionType: 'ITEM_CREATE',
    actionTitle: 'Thêm mới thiết bị vào kho lưu trữ',
    performedBy: 'admin',
    performedByName: 'KS. Nguyễn Văn Khải',
    userRole: 'admin',
    targetId: 'cns-05',
    targetName: 'Máy chủ đồng bộ thời gian Meinberg LANTIME M300 GPS',
    targetCategory: 'GPS & Ăng-ten',
    targetSN: 'MB2024-11094',
    details: 'Nhập kho thiết bị mới theo gói dự án nâng cấp hệ thống đồng bộ thời gian GPS/NTP. Số lượng: 2 Bộ tại KHO-GPS-01 (Tủ C1 - Ngăn 1).',
    newData: 'SL: 2 | Kho: KHO-GPS-01 | SN: MB2024-11094',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log-106',
    timestamp: '18/08/2026 16:20:45',
    actionType: 'STOCK_RETURN',
    actionTitle: 'Thu hồi hoàn kho thiết bị từ hệ thống',
    performedBy: 'admin',
    performedByName: 'KS. Nguyễn Văn Khải',
    userRole: 'admin',
    targetId: 'cns-06',
    targetName: 'Bộ chia tín hiệu RF Cavity Filter VHF 118-137MHz',
    targetCategory: 'VHF AM',
    targetSN: 'FL2022-00823',
    details: 'Thu hồi hoàn trả x1 Bộ từ KS. Đặng Việt Cường (Phòng Thí Nghiệm Lab CNS). Tình trạng: Tốt, hoạt động hoàn hảo sau kiểm thử.',
    prevData: 'Tồn kho: 0',
    newData: 'Tồn kho: 1 (Đã hoàn kho)',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log-107',
    timestamp: '15/08/2026 08:00:12',
    actionType: 'AUTH_LOGIN',
    actionTitle: 'Đăng nhập phiên làm việc Quản trị viên',
    performedBy: 'admin',
    performedByName: 'KS. Nguyễn Văn Khải',
    userRole: 'admin',
    details: 'Đăng nhập thành công vào Hệ Thống Quản Lý Kho & Vật Tư Kỹ Thuật CNS/ATM.',
    ipAddress: '192.168.1.45 (Máy Trạm Kỹ Thuật Đội Thông Tin)'
  }
];


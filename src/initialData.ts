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
  'VHF AM',
  'VCCS',
  'GPS & Ăng-ten',
  'Ghi âm & Lưu trữ',
  'Nguồn & UPS',
  'Mạng & Truyền dẫn',
  'Khác'
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'cns-01',
    name: 'Khối máy phát VHF AM Jotron TA-7650',
    pn: 'TA-7650-50W',
    sn: 'JT2024-88410',
    warehouse: 'KHO-VHF-01',
    loc: 'Tủ A1 - Ngăn 1',
    qty: 2,
    auditStatus: 'OK',
    auditDate: '26/08/2026 08:30',
    auditNote: 'Đã kiểm tra công suất phát đạt chuẩn 50W',
    category: 'VHF AM',
    imageUrl: imgVhf,
    imagePrompt: 'Khối máy phát VHF AM chuyên dụng TA-7650 lắp trong tủ rack viễn thông hàng không',
    history: [
      {
        id: 'h-01',
        status: 'OK',
        date: '26/08/2026 08:30',
        note: 'Kiểm tra định kỳ quý 3, thông số RF ổn định',
        user: 'admin'
      }
    ]
  },
  {
    id: 'cns-02',
    name: 'Khối máy thu VHF AM Jotron RA-7203',
    pn: 'RA-7203-RX',
    sn: 'JT2024-77312',
    warehouse: 'KHO-VHF-02',
    loc: 'Tủ A1 - Ngăn 2',
    qty: 3,
    auditStatus: 'OK',
    auditDate: '26/08/2026 08:45',
    auditNote: 'Độ nhạy thu tốt, Squelch hoạt động chuẩn',
    category: 'VHF AM',
    imageUrl: imgVhf,
    history: [
      {
        id: 'h-02',
        status: 'OK',
        date: '26/08/2026 08:45',
        note: 'Kiểm định độ nhạy thu tín hiệu',
        user: 'admin'
      }
    ]
  },
  {
    id: 'cns-03',
    name: 'Bộ chuyển mạch thoại VCCS Frequentis VCS3020X Card IP',
    pn: 'VCS3020X-IPB',
    sn: 'FQ-8921-0044',
    warehouse: 'KHO-VCCS-01',
    loc: 'Tủ B2 - Ngăn 3',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '25/08/2026 14:10',
    auditNote: 'Card dự phòng nóng còn nguyên niêm phong',
    category: 'VCCS',
    imageUrl: imgVccs,
    imagePrompt: 'Card IP chuyển mạch thoại VCCS Frequentis VCS3020X chuyên dụng',
    history: [
      {
        id: 'h-03',
        status: 'OK',
        date: '25/08/2026 14:10',
        note: 'Kiểm tra niêm phong kho dự phòng',
        user: 'admin'
      }
    ]
  },
  {
    id: 'cns-04',
    name: 'Card giao tiếp Audio 8 kênh VCCS SITTI Multiswitch',
    pn: 'SITTI-AUD-8CH',
    sn: 'ST2023-44109',
    warehouse: 'KHO-VCCS-02',
    loc: 'Tủ B2 - Ngăn 4',
    qty: 2,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'VCCS',
    imageUrl: imgVccs,
    history: []
  },
  {
    id: 'cns-05',
    name: 'Ăng-ten lưỡng cực VHF Ground Plane chuyên dụng',
    pn: 'ANT-VHF-GP118',
    sn: 'AT2024-0012',
    warehouse: 'KHO-ANT-01',
    loc: 'Kho ngoài - Giá treo 2',
    qty: 4,
    auditStatus: 'OK',
    auditDate: '26/08/2026 09:15',
    auditNote: 'VSWR < 1.3 trong dải 118-137 MHz',
    category: 'GPS & Ăng-ten',
    imageUrl: imgRadar,
    history: []
  },
  {
    id: 'cns-06',
    name: 'Bộ phân phối tín hiệu GPS Time Server Meinberg LANTIME M300',
    pn: 'M300-GPS-NTP',
    sn: 'MB2022-99014',
    warehouse: 'KHO-GPS-01',
    loc: 'Tủ C1 - Ngăn 1',
    qty: 1,
    auditStatus: 'OK',
    auditDate: '24/08/2026 10:20',
    auditNote: 'Đồng bộ xung 1PPS và NTP đạt chuẩn Stratum 1',
    category: 'GPS & Ăng-ten',
    imageUrl: imgGps,
    imagePrompt: 'Máy chủ đồng bộ thời gian GPS Time Server Meinberg LANTIME M300 chuẩn hàng không',
    history: []
  },
  {
    id: 'cns-07',
    name: 'Ổ cứng chuyên dụng ghi âm thoại hàng không NiceLog SAS 2TB',
    pn: 'NL-SAS-2TB-ENT',
    sn: 'WD2023-882194',
    warehouse: 'KHO-REC-01',
    loc: 'Tủ C2 - Ngăn 2',
    qty: 6,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'Ghi âm & Lưu trữ',
    imageUrl: imgRecorder,
    history: []
  },
  {
    id: 'cns-08',
    name: 'Module nguồn dự phòng Hot-Swap Rohde & Schwarz Series 4200',
    pn: 'RS4200-PSU-48V',
    sn: 'RS2024-55102',
    warehouse: 'KHO-PWR-01',
    loc: 'Tủ D1 - Ngăn 2',
    qty: 3,
    auditStatus: 'MISSING',
    auditDate: '25/08/2026 16:00',
    auditNote: 'Thiếu 01 module đã xuất thay thế tại trạm đài phụ',
    category: 'Nguồn & UPS',
    imageUrl: imgUps,
    history: [
      {
        id: 'h-04',
        status: 'MISSING',
        date: '25/08/2026 16:00',
        note: 'Ghi nhận xuất khẩn cấp 1 bộ cho đài phụ cận',
        user: 'guest'
      }
    ]
  },
  {
    id: 'cns-09',
    name: 'Bộ lọc thông dải RF Cavity Filter VHF 118-137MHz',
    pn: 'BPF-118137-4C',
    sn: 'FL2023-11029',
    warehouse: 'KHO-RF-01',
    loc: 'Tủ A2 - Ngăn 3',
    qty: 2,
    auditStatus: 'OK',
    auditDate: '26/08/2026 07:50',
    auditNote: 'Suy hao chèn < 0.8dB, độ cách ly > 30dB',
    category: 'VHF AM',
    imageUrl: imgVhf,
    history: []
  },
  {
    id: 'cns-10',
    name: 'Bộ cấp nguồn liên tục UPS Online Eaton 9PX 3000VA RT',
    pn: '9PX3000IRT2U',
    sn: 'ET2023-77419',
    warehouse: 'KHO-UPS-01',
    loc: 'Phòng nguồn - Bệ 1',
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: 'Nguồn & UPS',
    imageUrl: imgUps,
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


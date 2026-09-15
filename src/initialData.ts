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
  if (query.includes('radar') || query.includes('giám sát') || query.includes('ssr') || query.includes('psr') || query.includes('buc')) {
    return imgRadar;
  }
  if (query.includes('ghi âm') || query.includes('recorder') || query.includes('lưu trữ') || query.includes('nices')) {
    return imgRecorder;
  }
  if (query.includes('nguồn') || query.includes('ups') || query.includes('pin') || query.includes('ắc quy') || query.includes('rectifier')) {
    return imgUps;
  }
  if (query.includes('vccs') || query.includes('thoại') || query.includes('sitti') || query.includes('card') || query.includes('voice') || query.includes('fxo') || query.includes('fxs') || query.includes('e&m')) {
    return imgVccs;
  }
  if (query.includes('gps') || query.includes('thời gian') || query.includes('time server') || query.includes('ăng-ten') || query.includes('antenna')) {
    return imgGps;
  }
  if (query.includes('switch') || query.includes('router') || query.includes('quang') || query.includes('mạng') || query.includes('cisco') || query.includes('cl.2') || query.includes('v.35') || query.includes('rs232')) {
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
    id: "item-1779873200226",
    name: "CARD DỮ LIỆU VS/6S/4E&M",
    pn: "MP-4100M-VS/6S/4E&M/UTP",
    sn: "2428000981",
    warehouse: "MN-DHB-TBK-1071",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: 'MISSING',
    auditDate: '00:22:08 3/9/2026',
    auditNote: "Quét mã xác nhận Đủ",
    category: "MP2100 & MP4100",
    imageUrl: imgVccs,
    history: [
          {
                "id": "h-1788369728263-0",
                "status": "MISSING",
                "date": "00:22:08 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369710525-0",
                "status": "OK",
                "date": "00:21:50 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369709203-0",
                "status": "OK",
                "date": "00:21:49 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369701315-0",
                "status": "OK",
                "date": "00:21:41 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369700581-0",
                "status": "OK",
                "date": "00:21:40 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369699868-0",
                "status": "OK",
                "date": "00:21:39 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369699108-0",
                "status": "OK",
                "date": "00:21:39 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369698392-0",
                "status": "OK",
                "date": "00:21:38 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788049073919",
                "status": "OK",
                "date": "07:17:53 30/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          },
          {
                "id": "h-1787737161586-0",
                "status": "MISSING",
                "date": "16:39:21 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737161475-0",
                "status": "MISSING",
                "date": "16:39:21 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737161363-0",
                "status": "MISSING",
                "date": "16:39:21 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737161251-0",
                "status": "MISSING",
                "date": "16:39:21 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737161140-0",
                "status": "MISSING",
                "date": "16:39:21 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737161031-0",
                "status": "MISSING",
                "date": "16:39:21 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160921-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160810-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160698-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160586-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160477-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160369-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160251-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160142-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737160034-0",
                "status": "MISSING",
                "date": "16:39:20 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737145353-0",
                "status": "OK",
                "date": "16:39:05 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737145003-0",
                "status": "OK",
                "date": "16:39:05 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737144879-0",
                "status": "OK",
                "date": "16:39:04 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787737144769-0",
                "status": "OK",
                "date": "16:39:04 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-use-1787734813353",
                "status": "OK",
                "date": "16:00:13 26/8/2026",
                "note": "Lắp đặt sử dụng x1 chiếc tại: tạ (Người nhận: Nguyễn Trong A)",
                "user": "admin"
          },
          {
                "id": "h-1787731090138-0",
                "status": "OK",
                "date": "14:58:10 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779873306704",
    name: "CARD TRUNG KẾ E1",
    pn: "MP-4100M-VS/6S/8E1T1/UTP",
    sn: "2428000980",
    warehouse: "MN-DHB-TBK-1070",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: 'MISSING',
    auditDate: '00:22:47 3/9/2026',
    auditNote: "Quét mã xác nhận Đủ",
    category: "MP2100 & MP4100",
    imageUrl: imgVhf,
    history: [
          {
                "id": "h-1788369767164-1",
                "status": "MISSING",
                "date": "00:22:47 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369755547-1",
                "status": "MISSING",
                "date": "00:22:35 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788049105548",
                "status": "OK",
                "date": "07:18:25 30/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          },
          {
                "id": "h-1787732391611-1",
                "status": "OK",
                "date": "15:19:51 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732391502-1",
                "status": "OK",
                "date": "15:19:51 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732391394-1",
                "status": "OK",
                "date": "15:19:51 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732391045-1",
                "status": "OK",
                "date": "15:19:51 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390933-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390823-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390712-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390602-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390493-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390385-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732390276-1",
                "status": "OK",
                "date": "15:19:50 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389942-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389833-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389726-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389619-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389507-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389400-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1787732389286-1",
                "status": "OK",
                "date": "15:19:49 26/8/2026",
                "note": "Vât tư 123456",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779873408159",
    name: "CARD XỬ LÝ DỮ LIỆU (MP4100)",
    pn: "MP-4100M-CL.2/GBEAUTP",
    sn: "2428000979",
    warehouse: "MN-DHB-TBK-1072",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: 'OK',
    auditDate: '00:33:09 3/9/2026',
    auditNote: "Quét mã xác nhận Đủ",
    category: "MP2100 & MP4100",
    imageUrl: imgVhf,
    history: [
          {
                "id": "h-1788370389764-2",
                "status": "OK",
                "date": "00:33:09 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370386850-2",
                "status": "OK",
                "date": "00:33:06 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370382836-2",
                "status": "OK",
                "date": "00:33:02 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370382441-2",
                "status": "OK",
                "date": "00:33:02 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370382327-2",
                "status": "OK",
                "date": "00:33:02 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381995-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381887-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381774-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381667-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381559-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381224-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381116-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370381008-2",
                "status": "OK",
                "date": "00:33:01 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370380899-2",
                "status": "OK",
                "date": "00:33:00 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370379969-2",
                "status": "OK",
                "date": "00:32:59 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370379232-2",
                "status": "OK",
                "date": "00:32:59 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370378504-2",
                "status": "OK",
                "date": "00:32:58 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370377778-2",
                "status": "OK",
                "date": "00:32:57 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370376395-2",
                "status": "OK",
                "date": "00:32:56 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370352092-2",
                "status": "OK",
                "date": "00:32:32 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370341465-2",
                "status": "MISSING",
                "date": "00:32:21 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788370340735-2",
                "status": "MISSING",
                "date": "00:32:20 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369755117-2",
                "status": "MISSING",
                "date": "00:22:35 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369754709-2",
                "status": "MISSING",
                "date": "00:22:34 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369754023-2",
                "status": "MISSING",
                "date": "00:22:34 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788369752271-2",
                "status": "MISSING",
                "date": "00:22:32 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048975342-2",
                "status": "OK",
                "date": "07:16:15 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048975233-2",
                "status": "OK",
                "date": "07:16:15 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048974499-2",
                "status": "OK",
                "date": "07:16:14 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048973835-2",
                "status": "OK",
                "date": "07:16:13 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048973399-2",
                "status": "OK",
                "date": "07:16:13 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048972967-2",
                "status": "OK",
                "date": "07:16:12 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048972535-2",
                "status": "OK",
                "date": "07:16:12 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048972101-2",
                "status": "OK",
                "date": "07:16:12 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048971667-2",
                "status": "OK",
                "date": "07:16:11 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048971241-2",
                "status": "OK",
                "date": "07:16:11 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048970800-2",
                "status": "OK",
                "date": "07:16:10 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788048970054-2",
                "status": "OK",
                "date": "07:16:10 30/8/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779873511577",
    name: "CARD THOẠI 2W FXO, 4 KÊNH/CARD",
    pn: "MP-2100M-VC-4A/FXO",
    sn: "1951002140 1951002141",
    warehouse: "MN-DHB-TBK-0743",
    loc: "TỦ 2- VTDP",
    qty: 2,
    auditStatus: 'MISSING',
    auditDate: '00:22:30 3/9/2026',
    auditNote: "Quét mã xác nhận Đủ",
    category: "MP2100 & MP4100",
    imageUrl: imgVccs,
    history: [
          {
                "id": "h-1788369750278-3",
                "status": "MISSING",
                "date": "00:22:30 3/9/2026",
                "note": "Kiểm kê tự động bằng hệ thống quét QR",
                "user": "admin"
          },
          {
                "id": "h-1788049110530",
                "status": "OK",
                "date": "07:18:30 30/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779873733210",
    name: "Card Trung kế V.35",
    pn: "Đang cập nhật",
    sn: "10022783",
    warehouse: "MN-DHB-TBK-0197",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "OCM",
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: "item-1779874050273",
    name: "Card V.35 Main Link module KM-2100M-KML.1/ N8",
    pn: "KM-2100M-KML.1/N8",
    sn: "2130003593",
    warehouse: "",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "KLM2100",
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: "item-1779874132339",
    name: "Card Low Speed Module RS232 KM-2100M-KLS.1/N8",
    pn: "KM-2100M-KLS.1/N",
    sn: "1707003336",
    warehouse: "MN-DHB-TBK-0176",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "KLM2100",
    imageUrl: imgSwitch,
    history: [
          {
                "id": "h-1787734434189",
                "status": "OK",
                "date": "15:53:54 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779874213055",
    name: "Card FXO",
    pn: "KM-2000M-KVF4/FXO",
    sn: "1709002492",
    warehouse: "MN-DHB-TBK-0172",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "KLM2100",
    imageUrl: imgVccs,
    history: [
          {
                "id": "h-1787734432920",
                "status": "OK",
                "date": "15:53:52 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779874270966",
    name: "Card FXS",
    pn: "KM-2000M-KVF4/FXS",
    sn: "1709002488",
    warehouse: "MN-DHB-TBK-0171",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "KLM2100",
    imageUrl: imgVccs,
    history: [
          {
                "id": "h-1787734431647",
                "status": "OK",
                "date": "15:53:51 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1779874323740",
    name: "Card 2 Channel PCM/ADPCM KM-2100M-KVC.1M/EC/E&M",
    pn: "KM-2100M-KVC.1M/EC/E&M",
    sn: "1602000557",
    warehouse: "MN-DHB-TBK-0154",
    loc: "TỦ 2- VTDP",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "KLM2100",
    imageUrl: imgVccs,
    history: [
          {
                "id": "h-1787734430445",
                "status": "OK",
                "date": "15:53:50 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1780838524884",
    name: "card sử lý trong khối Ectier",
    pn: "",
    sn: "828",
    warehouse: "MN-DHB-HFA-0003",
    loc: "MN-DHB-HFA-0026Đã giao về kho ACC Ngày 11/02/2026",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "Khác",
    imageUrl: imgVhf,
    history: [
          {
                "id": "h-1787734428579",
                "status": "OK",
                "date": "15:53:48 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1780839235189",
    name: "Khối công suất",
    pn: "",
    sn: "547",
    warehouse: "MN-DHB-HFA-0007",
    loc: "Đã giao về kho ACC Ngày 11/02/2026",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "VHF AM",
    imageUrl: imgVhf,
    history: [
          {
                "id": "h-1787734435805",
                "status": "OK",
                "date": "15:53:55 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1780839362027",
    name: "Modem ATRIE",
    pn: "",
    sn: "Đang cập nhật",
    warehouse: "MN-DHB-HFA-0012",
    loc: "Đã giao về kho ACC Ngày 11/02/2026",
    qty: 2,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "VHF AM",
    imageUrl: imgVhf,
    history: [
          {
                "id": "h-1787734436936",
                "status": "OK",
                "date": "15:53:56 26/8/2026",
                "note": "Kiểm bằng nhấp chọn nhanh trên danh sách",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1780839421635",
    name: "Receiver multi couple dải tần HF GTA5030.4",
    pn: "",
    sn: "26549",
    warehouse: "MN-DHB-HFA-0013",
    loc: "Đã giao về kho ACC Ngày 11/02/2026",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "VHF AM",
    imageUrl: imgVhf,
    history: []
  },
  {
    id: "item-1787654552908",
    name: "Test",
    pn: "xsda",
    sn: "đs",
    warehouse: "DẤ",
    loc: "sdaa",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "VCCS",
    imageUrl: imgVccs,
    history: []
  },
  {
    id: "item-1787730343194",
    name: "MUX",
    pn: "AD1234",
    sn: "1234567",
    warehouse: "QƯ12233",
    loc: "",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "VHF AM",
    imageUrl: imgVhf,
    history: []
  },
  {
    id: "item-1787878266038",
    name: "Modem Vệ tinh",
    pn: "",
    sn: "12345",
    warehouse: "MN-DHB-TBK-0043",
    loc: "test",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "Khác",
    imageUrl: imgVhf,
    history: []
  },
  {
    id: "item-1787880336657",
    name: "BUC Band công suất 25W",
    pn: "ALTX-CX-25",
    sn: "B12791",
    warehouse: "MN-DHB-TBK-1136",
    loc: "Đã bàn giao rada CMU 08/2026",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "Khác",
    imageUrl: imgRadar,
    history: [
          {
                "id": "h-use-1787880440241",
                "status": "OK",
                "date": "08:27:20 28/8/2026",
                "note": "Xuất sử dụng x1 bộ tại: Bàn Giao Radar CMU (Người nhận: Lê Công Quan Nhựt)",
                "user": "admin"
          }
    ]
  },
  {
    id: "item-1788152544875",
    name: "Card điều khiển",
    pn: "",
    sn: "17909002474/3",
    warehouse: "MN-DHB-TBK-0152",
    loc: "Tủ 2- Ngăn 3- VTDP đội TT",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "Mạng & Truyền dẫn",
    imageUrl: imgSwitch,
    history: []
  },
  {
    id: "item-1788152659220",
    name: "Card CCM -10",
    pn: "",
    sn: "10813733",
    warehouse: "MN-DHB-TBK-0159",
    loc: "Tủ 2- Ngăn 3 -VTDP đội TT",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "VHF AM",
    imageUrl: imgVhf,
    history: []
  },
  {
    id: "item-1788152733930",
    name: "Card FXO",
    pn: "",
    sn: "Test",
    warehouse: "",
    loc: "Tủ 2-Ngăn 2-VTDP đội Tt",
    qty: 1,
    auditStatus: null,
    auditDate: null,
    auditNote: '',
    category: "Mạng & Truyền dẫn",
    imageUrl: imgVccs,
    history: []
  }
];

export const INITIAL_DISPATCHED_RECORDS: DispatchedRecord[] = [
  {
    id: 'disp-01',
    type: 'USAGE_SLIP',
    docNumber: 'PB-2026/089',
    itemId: 'item-1787880336657',
    itemName: 'BUC Band công suất 25W',
    category: 'Khác',
    sn: 'B12791',
    pn: 'ALTX-CX-25',
    qty: 1,
    unit: 'Bộ',
    date: '28/08/2026 08:27',
    warehouse: 'MN-DHB-TBK-1136',
    originalLoc: 'Tủ 2- VTDP',
    receiverName: 'KS. Lê Công Quan Nhựt',
    targetLocation: 'Bàn Giao Radar CMU',
    purpose: 'Xuất sử dụng thay thế định kỳ hệ thống Radar CMU',
    notes: 'Thiết bị hoạt động bình thường sau bàn giao.',
    status: 'DEPLOYED'
  }
];

export const INITIAL_SYSTEM_AUDIT_LOGS: SystemAuditLogEntry[] = [
  {
    id: 'log-101',
    timestamp: '03/09/2026 00:33:09',
    actionType: 'INVENTORY_AUDIT',
    actionTitle: 'Kiểm kê tự động bằng hệ thống quét QR',
    performedBy: 'admin',
    performedByName: 'Quản trị viên',
    userRole: 'admin',
    targetId: 'item-1779873408159',
    targetName: 'CARD XỬ LÝ DỮ LIỆU (MP4100)',
    targetCategory: 'MP2100 & MP4100',
    targetSN: '2428000979',
    details: 'Quét mã xác nhận Đủ. Trạng thái kiểm kê: ĐẠT CHUẨN (OK)',
    prevData: 'Trạng thái: MISSING',
    newData: 'Trạng thái: OK'
  },
  {
    id: 'log-102',
    timestamp: '28/08/2026 08:27:20',
    actionType: 'USAGE_DISPATCH',
    actionTitle: 'Xuất sử dụng BUC Band công suất 25W',
    performedBy: 'admin',
    performedByName: 'Quản trị viên',
    userRole: 'admin',
    targetId: 'item-1787880336657',
    targetName: 'BUC Band công suất 25W',
    targetCategory: 'Khác',
    targetSN: 'B12791',
    details: 'Xuất sử dụng x1 bộ tại: Bàn Giao Radar CMU (Người nhận: Lê Công Quan Nhựt).'
  }
];

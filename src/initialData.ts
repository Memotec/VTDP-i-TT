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

export const INITIAL_MOCK_ITEM_IDS = new Set<string>([
  "item-1779873200226",
  "item-1779873306704",
  "item-1779873408159",
  "item-1779873511577",
  "item-1779873733210",
  "item-1779874050273",
  "item-1779874132339",
  "item-1779874213055",
  "item-1779874270966",
  "item-1779874323740",
  "item-1780838524884",
  "item-1780839235189",
  "item-1780839362027",
  "item-1780839421635",
  "item-1787654552908",
  "item-1787730343194",
  "item-1787878266038",
  "item-1787880336657",
  "item-1788152544875",
  "item-1788152659220",
  "item-1788152733930"
]);

export function isInitialMockItem(item: { id?: string } | null | undefined): boolean {
  if (!item || !item.id) return false;
  return INITIAL_MOCK_ITEM_IDS.has(item.id);
}

// User requested not to display or seed mock initialData
export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_DISPATCHED_RECORDS: DispatchedRecord[] = [];

export const INITIAL_SYSTEM_AUDIT_LOGS: SystemAuditLogEntry[] = [];

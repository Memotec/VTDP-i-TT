import { InventoryItem } from '../types.ts';

export interface ScanMatchResult {
  matched: boolean;
  rawCode: string;
  cleanCode: string;
  matchedItems: InventoryItem[];
  matchedIndices: number[];
  matchedField: 'warehouse' | 'sn' | 'id' | 'pn' | 'partial' | null;
  matchDescription: string;
}

export function parseScannedCode(raw: string): {
  clean: string;
  extractedCandidates: string[];
} {
  if (!raw) return { clean: '', extractedCandidates: [] };
  const str = raw.trim();
  const candidates: string[] = [];

  // 1. Check if JSON
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const obj = JSON.parse(str);
      if (typeof obj === 'object' && obj !== null) {
        if (obj.warehouse) candidates.push(String(obj.warehouse).trim());
        if (obj.sn) candidates.push(String(obj.sn).trim());
        if (obj.id) candidates.push(String(obj.id).trim());
        if (obj.pn) candidates.push(String(obj.pn).trim());
        if (obj.code) candidates.push(String(obj.code).trim());
        if (obj.barcode) candidates.push(String(obj.barcode).trim());
      }
    } catch {
      // not valid JSON
    }
  }

  // 2. Check if URL
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const url = new URL(str);
      const params = ['sn', 'warehouse', 'id', 'pn', 'code', 'item'];
      for (const p of params) {
        const val = url.searchParams.get(p);
        if (val) candidates.push(val.trim());
      }
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment && lastSegment.length > 2) {
        candidates.push(decodeURIComponent(lastSegment));
      }
    } catch {
      // not valid URL
    }
  }

  // 3. Raw trimmed string
  candidates.push(str);

  // 4. Strip common barcode / prefix patterns (e.g. "S/N: 12345", "P/N: ...", "MÃ KHO: ...")
  const prefixRegex = /^(s\/n|sn|serial|p\/n|pn|part|kho|mã kho|ma kho|makho|cns|id|code)[\s*:\-_=\.]+\s*/i;
  const stripped = str.replace(prefixRegex, '').trim();
  if (stripped && stripped !== str) {
    candidates.push(stripped);
  }

  // Deduplicate and filter out empties
  const uniqueCandidates = Array.from(new Set(candidates.filter(c => c.length > 0)));
  return {
    clean: stripped || str,
    extractedCandidates: uniqueCandidates
  };
}

export function findMatchingInventoryItems(
  rawInput: string,
  inventory: InventoryItem[]
): ScanMatchResult {
  const { clean, extractedCandidates } = parseScannedCode(rawInput);
  if (!clean && extractedCandidates.length === 0) {
    return {
      matched: false,
      rawCode: rawInput,
      cleanCode: '',
      matchedItems: [],
      matchedIndices: [],
      matchedField: null,
      matchDescription: 'Mã quét rỗng'
    };
  }

  const upperCandidates = extractedCandidates.map(c => c.toUpperCase());

  // Pass 1: Exact match on Warehouse code (Mã kho)
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item.warehouse) {
      const itemWh = item.warehouse.trim().toUpperCase();
      if (upperCandidates.includes(itemWh)) {
        return {
          matched: true,
          rawCode: rawInput,
          cleanCode: clean,
          matchedItems: [item],
          matchedIndices: [i],
          matchedField: 'warehouse',
          matchDescription: `Khớp Mã Kho (${item.warehouse})`
        };
      }
    }
  }

  // Pass 2: Exact match on Serial Number (S/N)
  const snMatches: { item: InventoryItem; idx: number }[] = [];
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item.sn) {
      const itemSn = item.sn.trim().toUpperCase();
      if (upperCandidates.includes(itemSn)) {
        snMatches.push({ item, idx: i });
      }
    }
  }
  if (snMatches.length > 0) {
    return {
      matched: true,
      rawCode: rawInput,
      cleanCode: clean,
      matchedItems: snMatches.map(m => m.item),
      matchedIndices: snMatches.map(m => m.idx),
      matchedField: 'sn',
      matchDescription: `Khớp Số S/N (${snMatches[0].item.sn})`
    };
  }

  // Pass 3: Exact match on ID
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item.id) {
      const itemId = item.id.trim().toUpperCase();
      if (upperCandidates.includes(itemId)) {
        return {
          matched: true,
          rawCode: rawInput,
          cleanCode: clean,
          matchedItems: [item],
          matchedIndices: [i],
          matchedField: 'id',
          matchDescription: `Khớp Mã Thiết Bị (${item.id})`
        };
      }
    }
  }

  // Pass 4: Match on Part Number (P/N)
  const pnMatches: { item: InventoryItem; idx: number }[] = [];
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item.pn) {
      const itemPn = item.pn.trim().toUpperCase();
      if (upperCandidates.includes(itemPn)) {
        pnMatches.push({ item, idx: i });
      }
    }
  }
  if (pnMatches.length > 0) {
    return {
      matched: true,
      rawCode: rawInput,
      cleanCode: clean,
      matchedItems: pnMatches.map(m => m.item),
      matchedIndices: pnMatches.map(m => m.idx),
      matchedField: 'pn',
      matchDescription: `Khớp Part Number P/N (${pnMatches[0].item.pn})`
    };
  }

  // Pass 5: Substring / partial match (min 4 characters)
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    const itemWh = (item.warehouse || '').trim().toUpperCase();
    const itemSn = (item.sn || '').trim().toUpperCase();

    for (const cand of upperCandidates) {
      if (cand.length >= 4) {
        if (itemSn && (itemSn.includes(cand) || cand.includes(itemSn))) {
          return {
            matched: true,
            rawCode: rawInput,
            cleanCode: clean,
            matchedItems: [item],
            matchedIndices: [i],
            matchedField: 'partial',
            matchDescription: `Khớp một phần S/N (${item.sn})`
          };
        }
        if (itemWh && (itemWh.includes(cand) || cand.includes(itemWh))) {
          return {
            matched: true,
            rawCode: rawInput,
            cleanCode: clean,
            matchedItems: [item],
            matchedIndices: [i],
            matchedField: 'partial',
            matchDescription: `Khớp một phần Mã Kho (${item.warehouse})`
          };
        }
      }
    }
  }

  return {
    matched: false,
    rawCode: rawInput,
    cleanCode: clean,
    matchedItems: [],
    matchedIndices: [],
    matchedField: null,
    matchDescription: `Không tìm thấy thiết bị nào khớp với mã "${rawInput}"`
  };
}

import { UnitOwner, VPSlot } from './mockDb';

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const OWNER_RANGE = import.meta.env.VITE_GOOGLE_SHEETS_OWNER_RANGE || 'UnitNoOwnerInfo!A2:I';

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(SPREADSHEET_ID && API_KEY);
}
export async function fetchSheetSlots(date: string): Promise<VPSlot[]> {
  const response = await fetch(`/api/slots?date=${date}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data.slots;
}

export async function initSheetSlots(): Promise<void> {
  await fetch('/api/init-slots', { method: 'POST' });
}
function buildSheetsUrl(range: string): string {
  if (!SPREADSHEET_ID || !API_KEY) {
    throw new Error('Google Sheets configuration is missing. Set VITE_GOOGLE_SHEETS_SPREADSHEET_ID and VITE_GOOGLE_SHEETS_API_KEY.');
  }

  const encodedRange = encodeURIComponent(range);
  return `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
}

async function fetchSheetValues(range: string): Promise<string[][]> {
  const url = buildSheetsUrl(range);
  console.log('[SheetDb] fetching sheet range', range, 'url', url);
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    console.error('[SheetDb] sheet fetch failed', body);
    throw new Error(body.error?.message || `Google Sheets request failed with status ${response.status}`);
  }

  console.log('[SheetDb] sheet fetch returned rows', (body.values || []).length, 'example first row', body.values?.[0]);
  console.log('[SheetDb] sheet fetch body values', body.values);
  return body.values || [];
}

export async function fetchSheetOwners(): Promise<UnitOwner[]> {
  const rows = await fetchSheetValues(OWNER_RANGE);
  return rows.map((row, index) => ({
    UnitNo: row[0] || '',
    PurchaserName: row[1] || '',
    PurchaserEmail: row[2] || '',
    Eligibility: row[3] || '',
    DateSendVPNotice: row[4] || '',
    VPAppointmentDate: row[5] || null,
    Block: row[6] || '',
    UnitType: row[7] || '',
    Size: Number(row[8] || 0),
    rowIndex: index + 2,
  }));
}

export async function findOwnerUnit(unitNo: string): Promise<UnitOwner | null> {
  const rows = await fetchSheetValues(OWNER_RANGE);
  const normalize = (s: any) => {
    try {
      return (String(s || '')).normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
    } catch (e) {
      return String(s || '').trim().toLowerCase();
    }
  };

  const lookup = normalize(unitNo);
  console.log('[SheetDb] lookup unitNo (normalized):', lookup);
  console.log('[SheetDb] rows type:', rows.map((row) => ({ type: typeof row, keys: Object.keys(row), firstCell: (row[0] || '').toString() })));
  // Detailed char diagnostics for first cell of each row
  try {
    const diagnostics = rows.map((row: any, i: number) => {
      const cell = (row && row[0]) || '';
      const normalized = normalize(cell);
      return {
        index: i,
        raw: cell,
        normalized,
        json: JSON.stringify(cell),
        chars: (cell + '').split('').map((c: string) => ({ ch: c, code: c.charCodeAt(0) }))
      };
    });
    console.log('[SheetDb] first-cell diagnostics:', diagnostics);
  } catch (e) {
    console.error('[SheetDb] diagnostics error', e);
  }
  const normalizedList = rows.map((row: any, i: number) => ({ index: i, raw: (row && row[0]) || '', normalized: normalize((row && row[0]) || '') }));
  console.log('[SheetDb] normalized first-cells:', normalizedList);

  const rowIndex = rows.findIndex((row) => normalize((row && row[0]) || '') === lookup);
  console.log('[SheetDb] findIndex result:', rowIndex);
  if (rowIndex === -1) {
    console.log('[SheetDb] unit not found in loaded rows');
    return null;
  }

  const row = rows[rowIndex];
  return {
    UnitNo: row[0] || '',
    PurchaserName: row[1] || '',
    PurchaserEmail: row[2] || '',
    Eligibility: row[3] || '',
    DateSendVPNotice: row[4] || '',
    VPAppointmentDate: row[5] || null,
    Block: row[6] || '',
    UnitType: row[7] || '',
    Size: Number(row[8] || 0),
    rowIndex: rowIndex + 2,
  };

  
}

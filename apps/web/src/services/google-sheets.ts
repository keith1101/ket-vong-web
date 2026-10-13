export interface SheetExpenseItem {
  id: number;
  stt: number;
  date: string;
  category: string;
  item: string;
  amount: number;
  paymentMethod: string;
  note: string;
}

export interface SheetLedgerData {
  title: string;
  targetBudget: number;
  totalSpent: number;
  remainingBudget: number;
  usageRate: string;
  items: SheetExpenseItem[];
  categories: string[];
  categoryTotals: Record<string, number>;
  sheetUrl: string;
  embedUrl: string;
  lastSyncedAt: string;
}

export const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M/edit?usp=sharing';

export function extractSpreadsheetId(url?: string): string {
  if (!url) return '12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M';
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : '12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M';
}

export function getGoogleSheetEmbedUrl(url?: string): string {
  const id = extractSpreadsheetId(url);
  return `https://docs.google.com/spreadsheets/d/${id}/htmlembed?widget=true&headers=false`;
}

export function getGoogleSheetCsvUrl(url?: string): string {
  const id = extractSpreadsheetId(url);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCurrency(str?: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function parseGoogleSheetCsv(csv: string, sheetUrl: string): SheetLedgerData {
  const rawLines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = rawLines.map(parseCsvLine);

  let title = 'Sổ Quỹ Thu Chi Hoạt Động';
  let targetBudget = 4000000;
  let explicitTotalSpent: number | null = null;

  // 1. Quét tìm tiêu đề và khối ngân sách đầu trang
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const row = rows[i];
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('quản lý') || joined.includes('chi tiêu') || joined.includes('kết vòng')) {
      const foundTitle = row.find((cell) => cell.length > 5);
      if (foundTitle) title = foundTitle;
    }
    if (joined.includes('mục tiêu') || joined.includes('ngân sách')) {
      const nextRow = rows[i + 1] || [];
      const budgetCell = row.find((c) => parseCurrency(c) > 0) || nextRow.find((c) => parseCurrency(c) > 0);
      if (budgetCell) {
        const parsed = parseCurrency(budgetCell);
        if (parsed > 0) targetBudget = parsed;
      }
    }
  }

  // 2. Tìm hàng tiêu đề của bảng dữ liệu (STT / Ngày / Phân loại / Số tiền...)
  let headerRowIndex = rows.findIndex((row) => {
    const lineStr = row.join(' ').toLowerCase();
    return (lineStr.includes('stt') || lineStr.includes('#')) &&
      (lineStr.includes('ngày') || lineStr.includes('phân loại') || lineStr.includes('số tiền'));
  });

  if (headerRowIndex === -1) {
    headerRowIndex = rows.findIndex((row) => row.join(' ').toLowerCase().includes('phân loại'));
  }

  const items: SheetExpenseItem[] = [];
  const categoryTotals: Record<string, number> = {};

  if (headerRowIndex !== -1 && headerRowIndex < rows.length - 1) {
    const header = rows[headerRowIndex].map((h) => h.toLowerCase());
    
    // Tự động ánh xạ cột
    const colStt = header.findIndex((h) => h.includes('stt') || h === '#');
    const colDate = header.findIndex((h) => h.includes('ngày') || h.includes('date'));
    const colCategory = header.findIndex((h) => h.includes('phân loại') || h.includes('hạng mục') || h.includes('nhóm'));
    const colItem = header.findIndex((h) => h.includes('tên món') || h.includes('vật phẩm') || h.includes('nội dung') || h.includes('mô tả'));
    const colAmount = header.findIndex((h) => h.includes('số tiền') || h.includes('thành tiền') || h.includes('chi'));
    const colMethod = header.findIndex((h) => h.includes('phương thức') || h.includes('hình thức') || h.includes('thanh toán'));
    const colNote = header.findIndex((h) => h.includes('ghi chú') || h.includes('nơi mua') || h.includes('chứng từ'));

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // Kiểm tra xem dòng có STT hoặc có dữ liệu mục chi hay không
      const rawStt = colStt !== -1 ? row[colStt] : row[1];
      const parsedStt = parseInt(rawStt, 10);
      const category = (colCategory !== -1 ? row[colCategory] : row[3]) || 'Chưa phân loại';
      const item = (colItem !== -1 ? row[colItem] : row[4]) || '';
      const rawAmount = colAmount !== -1 ? row[colAmount] : row[5];
      const amount = parseCurrency(rawAmount);
      const paymentMethod = (colMethod !== -1 ? row[colMethod] : row[6]) || 'Tiền mặt';
      const note = (colNote !== -1 ? row[colNote] : row[7]) || '';
      const date = (colDate !== -1 ? row[colDate] : row[2]) || '';

      // Bỏ qua dòng trống hoàn toàn hoặc dòng tổng cộng phụ bên dưới
      const joinedRow = row.join(' ').toLowerCase();
      if (joinedRow.includes('tổng cộng') && amount > 0) {
        explicitTotalSpent = amount;
        continue;
      }

      if (!parsedStt && !item && !category && amount === 0) continue;

      const validStt = isNaN(parsedStt) ? items.length + 1 : parsedStt;
      const expenseItem: SheetExpenseItem = {
        id: validStt,
        stt: validStt,
        date: date || '12/10/2026',
        category: category.trim() || 'Vật tư hoạt động',
        item: item.trim(),
        amount,
        paymentMethod: paymentMethod.trim() || 'Chuyển khoản',
        note: note.trim(),
      };

      items.push(expenseItem);

      if (amount > 0) {
        const catKey = expenseItem.category;
        categoryTotals[catKey] = (categoryTotals[catKey] || 0) + amount;
      }
    }
  }

  const computedTotalSpent = items.reduce((sum, it) => sum + it.amount, 0);
  const totalSpent = explicitTotalSpent !== null ? explicitTotalSpent : computedTotalSpent;
  const remainingBudget = Math.max(0, targetBudget - totalSpent);
  const usageRate = targetBudget > 0 ? `${((totalSpent / targetBudget) * 100).toFixed(1)}%` : '0,0%';

  const categories = Array.from(new Set(items.map((it) => it.category).filter(Boolean)));

  return {
    title,
    targetBudget,
    totalSpent,
    remainingBudget,
    usageRate,
    items,
    categories,
    categoryTotals,
    sheetUrl,
    embedUrl: getGoogleSheetEmbedUrl(sheetUrl),
    lastSyncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
}

// Fallback dữ liệu mẫu dự toán nếu không có mạng hoặc chưa nhập dữ liệu
export const FALLBACK_SHEET_DATA: SheetLedgerData = {
  title: 'Bảng Kế Hoạch & Quản Lý Chi Tiêu Kết Vòng',
  targetBudget: 4000000,
  totalSpent: 3950000,
  remainingBudget: 50000,
  usageRate: '98,8%',
  categories: ['1. Vật tư hoạt động', '2. Vật phẩm thiết yếu', '3. Setup & trang trí', '4. In ấn & truyền thông', '5. Vận chuyển & dự phòng'],
  categoryTotals: {
    '1. Vật tư hoạt động': 1250000,
    '2. Vật phẩm thiết yếu': 1300000,
    '3. Setup & trang trí': 700000,
    '4. In ấn & truyền thông': 500000,
    '5. Vận chuyển & dự phòng': 200000,
  },
  items: [
    { id: 1, stt: 1, date: '12/10/2026', category: '1. Vật tư hoạt động', item: 'Cuộn cước co giãn 0.7mm (10 cuộn)', amount: 250000, paymentMethod: 'Chuyển khoản', note: 'Chợ Đại Quang Minh' },
    { id: 2, stt: 2, date: '12/10/2026', category: '1. Vật tư hoạt động', item: 'Hạt cườm pastel & chữ cái an toàn (1.5kg)', amount: 525000, paymentMethod: 'Chuyển khoản', note: 'Phụ liệu Chợ Lớn' },
    { id: 3, stt: 3, date: '12/10/2026', category: '1. Vật tư hoạt động', item: 'Charm kim loại tráng men hình ngộ nghĩnh (50 cái)', amount: 250000, paymentMethod: 'Ví điện tử', note: 'Shopee Mall phụ kiện' },
    { id: 4, stt: 4, date: '12/10/2026', category: '1. Vật tư hoạt động', item: 'Hộp giấy kraft & túi làm quà cho bệnh nhi (25 bộ)', amount: 175000, paymentMethod: 'Tiền mặt', note: 'Bao bì Sài Gòn' },
    { id: 5, stt: 5, date: '12/10/2026', category: '1. Vật tư hoạt động', item: 'Giấy A5, bút màu sáp, sticker trang trí', amount: 50000, paymentMethod: 'Tiền mặt', note: 'Nhà sách Fahasa' },
    { id: 6, stt: 6, date: '12/10/2026', category: '2. Vật phẩm thiết yếu', item: 'Sữa tươi dinh dưỡng tiệt trùng cho bé (2 thùng)', amount: 760000, paymentMethod: 'Chuyển khoản', note: 'Co.opmart' },
    { id: 7, stt: 7, date: '12/10/2026', category: '2. Vật phẩm thiết yếu', item: 'Bánh kẹo dinh dưỡng mềm an toàn (30 phần)', amount: 420000, paymentMethod: 'Chuyển khoản', note: 'Co.opmart' },
    { id: 8, stt: 8, date: '12/10/2026', category: '2. Vật phẩm thiết yếu', item: 'Khăn giấy ướt không cồn & nước rửa tay diệt khuẩn', amount: 120000, paymentMethod: 'Tiền mặt', note: 'Long Châu' },
    { id: 9, stt: 9, date: '12/10/2026', category: '3. Setup & trang trí', item: 'Backdrop sân khấu bạt Hiflex 3m x 2m', amount: 350000, paymentMethod: 'Chuyển khoản', note: 'Nhà in quảng cáo' },
    { id: 10, stt: 10, date: '12/10/2026', category: '3. Setup & trang trí', item: 'Standee chữ X và bảng đón tiếp workshop', amount: 200000, paymentMethod: 'Chuyển khoản', note: 'Nhà in quảng cáo' },
    { id: 11, stt: 11, date: '12/10/2026', category: '3. Setup & trang trí', item: 'Khăn trải bàn & khay phân loại hạt cườm', amount: 150000, paymentMethod: 'Ví điện tử', note: 'Cửa hàng gia dụng' },
    { id: 12, stt: 12, date: '12/10/2026', category: '4. In ấn & truyền thông', item: 'Thiệp mời trao tay & thiệp chúc viết tay (30 cái)', amount: 150000, paymentMethod: 'Chuyển khoản', note: 'Nhà in kỹ thuật số' },
    { id: 13, stt: 13, date: '12/10/2026', category: '4. In ấn & truyền thông', item: 'Bảng infographic các bước xâu vòng A3 (5 tấm)', amount: 150000, paymentMethod: 'Chuyển khoản', note: 'Nhà in kỹ thuật số' },
    { id: 14, stt: 14, date: '12/10/2026', category: '4. In ấn & truyền thông', item: 'Bảng tên BTC, tình nguyện viên & sticker lưu niệm', amount: 200000, paymentMethod: 'Ví điện tử', note: 'Xưởng in FPTU' },
    { id: 15, stt: 15, date: '12/10/2026', category: '5. Vận chuyển & dự phòng', item: 'Chi phí vận chuyển vật tư & thiết bị đến cơ sở', amount: 200000, paymentMethod: 'Ví điện tử', note: 'Giao hàng Grab' },
  ],
  sheetUrl: DEFAULT_SHEET_URL,
  embedUrl: getGoogleSheetEmbedUrl(DEFAULT_SHEET_URL),
  lastSyncedAt: 'Mặc định',
};

const CACHE_KEY = 'ketvong:sheet-ledger-cache';
const CACHE_TTL_MS = 2 * 60 * 1000; // Cache 2 phút

export async function fetchSheetLedger(sheetUrl?: string, forceRefresh = false): Promise<SheetLedgerData> {
  const targetUrl = sheetUrl || DEFAULT_SHEET_URL;
  const cacheKey = `${CACHE_KEY}:${extractSpreadsheetId(targetUrl)}`;

  if (!forceRefresh && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      }
    } catch {
      // Bỏ qua lỗi cache
    }
  }

  // 1. Thử fetch CSV qua link xuất bản công khai
  try {
    const csvUrl = getGoogleSheetCsvUrl(targetUrl);
    const res = await fetch(csvUrl, { cache: 'no-store' });
    if (res.ok) {
      const csvText = await res.text();
      if (csvText && csvText.length > 50) {
        const parsedData = parseGoogleSheetCsv(csvText, targetUrl);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: parsedData }));
          } catch {
            // storage full
          }
        }
        return parsedData;
      }
    }
  } catch (clientErr) {
    console.warn('[Google Sheets] Không thể tải trực tiếp CSV:', clientErr);
  }

  // 2. Thử fetch qua endpoint proxy backend
  try {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
    const res = await fetch(`${apiBase}/api/v1/fund/sheet-ledger`);
    if (res.ok) {
      const json = await res.json();
      if (json.data?.rawCsv) {
        const parsedData = parseGoogleSheetCsv(json.data.rawCsv, targetUrl);
        return parsedData;
      }
    }
  } catch (apiErr) {
    console.warn('[Google Sheets] Không thể tải qua API proxy:', apiErr);
  }

  // 3. Fallback dự phòng an toàn
  return {
    ...FALLBACK_SHEET_DATA,
    sheetUrl: targetUrl,
    embedUrl: getGoogleSheetEmbedUrl(targetUrl),
  };
}

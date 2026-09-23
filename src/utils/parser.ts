import * as XLSX from 'xlsx';
import { DayCategory, DayClassification, ExportSettings, PunchRow, RuleSettings } from '../types';

export interface ParsedDateInfo {
  year: number;
  month: number;
  day: number;
  dateObj: Date;
  dateKey: string;
  dayIndex: number;
  dayLabel: string;
  dayFullName: string;
  isWeekend: boolean;
}

export function parseDateString(
  dateStr: string,
  customWeekendDays: number[] = [0, 5, 6]
): ParsedDateInfo {
  const fallbackDate = new Date();
  if (!dateStr || !dateStr.trim()) {
    return {
      year: fallbackDate.getFullYear(),
      month: fallbackDate.getMonth() + 1,
      day: fallbackDate.getDate(),
      dateObj: fallbackDate,
      dateKey: '',
      dayIndex: -1,
      dayLabel: '',
      dayFullName: '',
      isWeekend: false,
    };
  }

  const clean = dateStr.trim();
  const parts = clean.split(/[.\/\-]/).map((p) => p.trim());

  let y = fallbackDate.getFullYear();
  let m = fallbackDate.getMonth() + 1;
  let d = fallbackDate.getDate();

  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (parts[0].length === 4 || p0 > 1000) {
        // YYYY.MM.DD
        y = p0;
        m = p1;
        d = p2;
      } else if (parts[2].length === 4 || p2 > 1000) {
        // DD.MM.YYYY or MM.DD.YYYY
        y = p2;
        if (p0 > 12) {
          d = p0;
          m = p1;
        } else if (p1 > 12) {
          m = p0;
          d = p1;
        } else {
          // Standard Egypt/MENA/SAP format: DD.MM.YYYY
          d = p0;
          m = p1;
        }
      } else {
        y = p0 < 50 ? 2000 + p0 : 1900 + p0;
        m = p1;
        d = p2;
      }
    }
  }

  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const dayLabel = dt.toLocaleDateString('en-US', { weekday: 'short' });
  const dayFullName = dt.toLocaleDateString('en-US', { weekday: 'long' });
  const dateKey = `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
  const isWeekend = customWeekendDays.includes(dow);

  return {
    year: y,
    month: m,
    day: d,
    dateObj: dt,
    dateKey,
    dayIndex: dow,
    dayLabel,
    dayFullName,
    isWeekend,
  };
}

export function parseRows(rawText: string): PunchRow[] {
  if (!rawText || !rawText.trim()) return [];

  const isDateToken = (token: string): boolean => {
    if (!token) return false;
    const clean = token.trim();
    // Must contain digits and date separators or be a date
    return /^(\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}|\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})$/.test(clean);
  };

  const isTimeToken = (token: string): boolean => {
    if (!token) return false;
    const clean = token.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM|am|pm))?$/i.test(clean)) return true;
    const lower = clean.toLowerCase();
    if (['00:00:00', '0:00', '00:00', '-', '—', '--', 'null', 'absent', 'غائب', 'غياب'].includes(lower)) {
      return true;
    }
    return false;
  };

  const normalizeTimeToken = (timeStr: string): string => {
    if (!timeStr) return '00:00:00';
    const clean = timeStr.trim();
    const lower = clean.toLowerCase();
    if (
      lower === '-' ||
      lower === '—' ||
      lower === '--' ||
      lower === 'absent' ||
      lower === 'null' ||
      lower === 'غائب' ||
      lower === 'غياب' ||
      lower === '0' ||
      lower === '0:00' ||
      lower === '00:00'
    ) {
      return '00:00:00';
    }

    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const s = ampmMatch[3] || '00';
      const ampm = ampmMatch[4].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
    }

    const parts = clean.split(':');
    if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return clean;
  };

  // 1. Split rawText into raw tokens by whitespace / newlines / tabs
  const rawTokens = rawText
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Combine consecutive time and AM/PM tokens (e.g. ['08:46', 'AM'] -> '08:46 AM')
  const mergedTokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const curr = rawTokens[i];
    const next = rawTokens[i + 1];
    if (
      /^\d{1,2}:\d{2}(:\d{2})?$/.test(curr) &&
      next &&
      /^(AM|PM|am|pm)$/i.test(next)
    ) {
      mergedTokens.push(`${curr} ${next}`);
      i++;
    } else {
      mergedTokens.push(curr);
    }
  }

  // Scan through mergedTokens, grouping tokens by date
  const rows: PunchRow[] = [];
  let currentIndex = 0;

  while (currentIndex < mergedTokens.length) {
    const token = mergedTokens[currentIndex];
    if (isDateToken(token)) {
      const dateToken = token;
      // Gather all tokens until the next date token
      const groupTokens: string[] = [];
      let j = currentIndex + 1;
      while (j < mergedTokens.length && !isDateToken(mergedTokens[j])) {
        groupTokens.push(mergedTokens[j]);
        j++;
      }

      // Filter for valid time tokens or placeholders
      const timeTokens = groupTokens.filter((t) => isTimeToken(t));

      let start = '00:00:00';
      let end = '00:00:00';

      if (timeTokens.length >= 2) {
        start = normalizeTimeToken(timeTokens[0]);
        end = normalizeTimeToken(timeTokens[1]);
      } else if (timeTokens.length === 1) {
        start = normalizeTimeToken(timeTokens[0]);
        end = '00:00:00';
      }

      rows.push({
        date: dateToken,
        start,
        end,
      });

      currentIndex = j;
    } else {
      currentIndex++;
    }
  }

  return rows;
}

export function toMinutes(hhmmss: string): number {
  const parts = hhmmss.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

export function fmtHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

export const DAY_NAMES: { index: number; short: string; long: string }[] = [
  { index: 0, short: 'Sun', long: 'Sunday' },
  { index: 1, short: 'Mon', long: 'Monday' },
  { index: 2, short: 'Tue', long: 'Tuesday' },
  { index: 3, short: 'Wed', long: 'Wednesday' },
  { index: 4, short: 'Thu', long: 'Thursday' },
  { index: 5, short: 'Fri', long: 'Friday' },
  { index: 6, short: 'Sat', long: 'Saturday' },
];

export function formatWeekendNames(weekendDays: number[]): string {
  if (!weekendDays || weekendDays.length === 0) return 'No Weekend Days (All Workdays)';
  const sorted = [...weekendDays].sort((a, b) => a - b);
  const names = sorted.map((d) => DAY_NAMES.find((item) => item.index === d)?.long || `Day ${d}`);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

// Sunday is a standard weekend along with Friday and Saturday by default: [0, 5, 6]
export function weekdayOf(
  dateStr: string,
  customWeekendDays: number[] = [0, 5, 6]
): { label: string; isWeekend: boolean; dayIndex: number } {
  const info = parseDateString(dateStr, customWeekendDays);
  return {
    label: info.dayLabel,
    isWeekend: info.isWeekend,
    dayIndex: info.dayIndex,
  };
}

export function weekdayFullOf(dateStr: string): string {
  const info = parseDateString(dateStr);
  return info.dayFullName;
}

export function toUSDate(dateStr: string): string {
  const info = parseDateString(dateStr);
  if (!info.month || !info.day || !info.year) return dateStr;
  return `${info.month}/${info.day}/${info.year}`;
}

export function to12Hour(hhmmss: string): string {
  if (!hhmmss || hhmmss === '—') return '—';
  const parts = hhmmss.split(':').map(Number);
  let h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function toHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function classifyDay(row: PunchRow, rules: RuleSettings): DayClassification {
  const isZero = (t: string) => t === '00:00:00';
  const startMin = isZero(row.start) ? null : toMinutes(row.start);

  let isLate = false;
  let lateMin = 0;

  if (rules.lateOn && startMin !== null) {
    const lateThresholdMin = toMinutes(rules.lateVal + ':00');
    if (startMin > lateThresholdMin) {
      isLate = true;
      lateMin = startMin - lateThresholdMin;
    }
  }

  if (isZero(row.start) && isZero(row.end)) {
    return {
      row,
      status: 'absent',
      workedMin: 0,
      startMin: null,
      endMin: null,
      reasons: [],
      overtimeMin: 0,
      isLate: false,
      lateMin: 0,
    };
  }

  if (!isZero(row.start) && isZero(row.end)) {
    return {
      row,
      status: 'missing',
      workedMin: 0,
      startMin,
      endMin: null,
      reasons: ['no checkout recorded'],
      overtimeMin: 0,
      isLate,
      lateMin,
    };
  }

  const endMin = toMinutes(row.end);
  const workedMin = Math.max(0, endMin - (startMin ?? 0));
  const reasons: string[] = [];
  let overtimeMin = 0;

  // Day of week check - accurately calculated
  const { dayIndex } = weekdayOf(row.date, rules.weekendDays || [0, 5, 6]);
  const isThursday = dayIndex === 4;
  const isThursdayEarly = (rules.thursdayEarlyShift ?? rules.tuesdayEarlyShift ?? true);
  const thursdayShiftEnd = rules.thursdayShiftEnd || rules.tuesdayShiftEnd || '16:00';
  const thursdayOTCutoff = rules.thursdayOvertimeStart || '16:50'; // Thursday OT starts at 4:50 PM (16:50)

  // The overtime threshold:
  // - On Thursday: 4:50 PM (16:50)
  // - On regular days: 5:50 PM (17:50, or rules.timeVal)
  const regularOTCutoff = rules.timeVal || '17:50';
  const effectiveOTCutoff = (isThursday && isThursdayEarly) ? thursdayOTCutoff : regularOTCutoff;
  const overtimeCutoffMin = toMinutes(effectiveOTCutoff + ':00');

  if (rules.timeOn) {
    if (endMin > overtimeCutoffMin) {
      const over = endMin - overtimeCutoffMin;
      if (isThursday && isThursdayEarly) {
        reasons.push(`checked out ${fmtHours(over)} after 4:50 PM cutoff (Thu shift ends 4:00 PM)`);
      } else {
        const displayCutoff = regularOTCutoff === '17:50' ? '5:50 PM' : regularOTCutoff;
        reasons.push(`checked out ${fmtHours(over)} after ${displayCutoff} cutoff`);
      }
      overtimeMin = Math.max(overtimeMin, over);
    }
  }

  if (rules.hoursOn) {
    const standardHours = isThursday && isThursdayEarly ? Math.max(1, rules.hoursVal - 1) : rules.hoursVal;
    const thresholdMin = standardHours * 60;
    // Overtime only starts counting after designated cutoff (4:50 PM on Thu, 5:50 PM on regular days)
    if (workedMin > thresholdMin && endMin > overtimeCutoffMin) {
      const over = endMin - overtimeCutoffMin;
      if (!reasons.some((r) => r.includes('cutoff'))) {
        reasons.push(`${fmtHours(over)} past standard hours`);
      }
      overtimeMin = Math.max(overtimeMin, over);
    }
  }

  const status = overtimeMin > 0 ? 'overtime' : 'present';

  return {
    row,
    status,
    workedMin,
    startMin,
    endMin,
    reasons,
    overtimeMin,
    isLate,
    lateMin,
  };
}

export function parseStickyNotes(notesText: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!notesText || !notesText.trim()) return result;

  const lines = notesText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const matchFull = line.match(/^(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})\s*[:\-—]\s*(.+)$/i);
    if (matchFull) {
      const dateInfo = parseDateString(matchFull[1]);
      if (dateInfo && dateInfo.dateKey) {
        result[dateInfo.dateKey] = matchFull[2].trim();
      }
      continue;
    }

    const matchWordMonth = line.match(/^([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?|\d{1,2}\s+[A-Za-z]+(?:,\s*\d{4})?)\s*[:\-—]\s*(.+)$/i);
    if (matchWordMonth) {
      const datePart = matchWordMonth[1];
      const reasonPart = matchWordMonth[2];
      const parsedDate = new Date(datePart.includes('20') ? datePart : `${datePart} 2026`);
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        result[`${y}.${m}.${d}`] = reasonPart.trim();
      }
    }
  }

  return result;
}

export function computePeriodLabel(dates: string[]): string {
  if (!dates || dates.length === 0) {
    const now = new Date();
    const curMonth = now.toLocaleString('en-US', { month: 'short' });
    return `Cycle 16 ${curMonth} – 15 Next Month`;
  }
  const sorted = [...dates].sort();
  const first = toUSDate(sorted[0]);
  const last = toUSDate(sorted[sorted.length - 1]);
  return `${first} – ${last}`;
}

export function exportOvertimeToExcel(
  classifiedList: DayClassification[],
  exportSettings: ExportSettings,
  dayReasons: Record<string, string> = {},
  overrides: Record<string, DayCategory> = {},
  weekendDays: number[] = [0, 5, 6]
): { success: boolean; missingDates: string[]; error?: string } {
  const name = exportSettings.name?.trim() || '';
  const employeeId = exportSettings.employeeId?.trim() || '';
  const shiftEnd = exportSettings.shiftEnd || '17:00';

  // MANDATORY SAP ID CHECK - Reject empty or placeholder values
  if (!employeeId || employeeId.toLowerCase() === 'employee id' || employeeId.toLowerCase() === 'sap id' || employeeId.toLowerCase() === 'null') {
    return {
      success: false,
      missingDates: [],
      error: '⛔ MANDATORY FIELD MISSING: SAP / Employee ID is strictly required. Please enter your valid SAP ID before exporting to Excel.',
    };
  }

  // MANDATORY EMPLOYEE NAME CHECK - Reject empty or placeholder values
  if (!name || name.toLowerCase() === 'employee name' || name.toLowerCase() === 'no employee name set' || name.toLowerCase() === 'null') {
    return {
      success: false,
      missingDates: [],
      error: '⛔ MANDATORY FIELD MISSING: Full Employee Name is strictly required. Please enter your full name before exporting to Excel.',
    };
  }

  const overtimeDays = classifiedList.filter((c) => {
    const isWeekendRow = weekdayOf(c.row.date, weekendDays).isWeekend;
    const isAbsent = c.status === 'absent';
    const effectiveCat = overrides[c.row.date] !== undefined
      ? overrides[c.row.date]
      : isWeekendRow
      ? 'weekend'
      : isAbsent
      ? 'absent'
      : c.status === 'overtime'
      ? 'overtime_manual'
      : 'present';
    return effectiveCat === 'overtime_manual';
  });

  if (overtimeDays.length === 0) {
    return { success: false, missingDates: [], error: 'No overtime days found in the current ledger.' };
  }

  // MANDATORY REASON CHECK: verify every overtime day has a reason
  const missingDates: string[] = [];
  for (const c of overtimeDays) {
    const reason = (dayReasons[c.row.date] || c.userReason || '').trim();
    if (!reason) {
      missingDates.push(c.row.date);
    }
  }

  if (missingDates.length > 0) {
    return {
      success: false,
      missingDates,
      error: `Mandatory Reason Missing: ${missingDates.length} overtime ${
        missingDates.length === 1 ? 'day has' : 'days have'
      } no reason specified. Every overtime entry must include a valid reason before exporting to Excel.`,
    };
  }

  const headers = ['Name', 'Employee ID', 'Date', 'Day', 'From', 'To', 'Total', 'Reason'];
  const dataRows = overtimeDays.map((c) => {
    const reason = (dayReasons[c.row.date] || c.userReason || '').trim();
    const isManualOT = overrides[c.row.date] === 'overtime_manual' && c.overtimeMin === 0;
    const otMins = isManualOT ? 60 : c.overtimeMin;
    const toTime = c.row.end && c.row.end !== '00:00:00' ? to12Hour(c.row.end) : '06:00 PM';
    
    // Accurately compute Day and From time
    const { dayIndex } = weekdayOf(c.row.date, weekendDays);
    const isThu = dayIndex === 4;
    const fromTime = isThu ? '04:00 PM' : to12Hour(shiftEnd + ':00');

    return [
      name,
      employeeId,
      toUSDate(c.row.date),
      weekdayFullOf(c.row.date),
      fromTime,
      toTime,
      toHM(otMins),
      reason,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 32 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 45 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Overtime');
  
  const safeName = name ? name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'employee';
  XLSX.writeFile(wb, `overtime_log_${safeName}_${employeeId || 'unknown'}.xlsx`);
  return { success: true, missingDates: [] };
}

export const DEFAULT_RAW_PUNCH = '';


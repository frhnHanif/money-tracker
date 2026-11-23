export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export interface CycleRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysInPeriod: number;
  year: number;
  month: number;
  resetDay: number;
  label: string;
  shortLabel: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Returns the date range for a given cycle (year, month) and resetDay.
 * - If resetDay <= 1: standard calendar month (1st to last day of month).
 * - If resetDay > 1: from resetDay of month to (resetDay - 1) of month + 1,
 *   with safe clamping for shorter months (e.g. Feb, 30-day months).
 */
export function getCycleRange(year: number, month: number, resetDay: number = 1): CycleRange {
  const safeResetDay = Math.max(1, Math.min(31, resetDay || 1));

  if (safeResetDay === 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = formatDateString(year, month, 1);
    const endDate = formatDateString(year, month, daysInMonth);
    const label = `${MONTHS[month - 1]} ${year}`;
    const shortLabel = `${MONTHS_SHORT[month - 1]} ${year}`;

    return {
      startDate,
      endDate,
      daysInPeriod: daysInMonth,
      year,
      month,
      resetDay: 1,
      label,
      shortLabel,
    };
  }

  // Start date in current month (clamped to max days of current month)
  const daysInCurrentMonth = new Date(year, month, 0).getDate();
  const startDay = Math.min(safeResetDay, daysInCurrentMonth);
  const startDate = formatDateString(year, month, startDay);

  // Next month calculation
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const nextResetDay = Math.min(safeResetDay, daysInNextMonth);

  // End date is 1 day before the next cycle starts
  const endD = new Date(nextYear, nextMonth - 1, nextResetDay - 1);
  const endYear = endD.getFullYear();
  const endMonth = endD.getMonth() + 1;
  const endDay = endD.getDate();
  const endDate = formatDateString(endYear, endMonth, endDay);

  // Calculate days in period
  const startObj = new Date(year, month - 1, startDay);
  const diffMs = endD.getTime() - startObj.getTime();
  const daysInPeriod = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

  // Format label: e.g. "23 Nov – 22 Des 2026"
  const startShortMonth = MONTHS_SHORT[month - 1];
  const endShortMonth = MONTHS_SHORT[endMonth - 1];
  const label =
    year === endYear
      ? `${startDay} ${startShortMonth} – ${endDay} ${endShortMonth} ${endYear}`
      : `${startDay} ${startShortMonth} ${year} – ${endDay} ${endShortMonth} ${endYear}`;

  const shortLabel = `${startDay} ${startShortMonth} – ${endDay} ${endShortMonth}`;

  return {
    startDate,
    endDate,
    daysInPeriod,
    year,
    month,
    resetDay: safeResetDay,
    label,
    shortLabel,
  };
}

/**
 * Returns which (year, month) cycle is active for a given date (defaults to today).
 * If today.getDate() >= clamped resetDay in this month:
 *   active cycle starts in this month (year, month).
 * If today.getDate() < clamped resetDay in this month:
 *   active cycle started in previous month (prevYear, prevMonth).
 */
export function getCurrentCycle(resetDay: number = 1, now: Date = new Date()): { year: number; month: number } {
  const safeResetDay = Math.max(1, Math.min(31, resetDay || 1));
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();

  if (safeResetDay === 1) {
    return { year: curYear, month: curMonth };
  }

  const daysInCurMonth = new Date(curYear, curMonth, 0).getDate();
  const effectiveResetDay = Math.min(safeResetDay, daysInCurMonth);

  if (curDay >= effectiveResetDay) {
    return { year: curYear, month: curMonth };
  } else {
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    return { year: prevYear, month: prevMonth };
  }
}

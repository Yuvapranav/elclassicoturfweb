// Mirrors src/utils/mockData.ts TIME_SLOTS on the frontend — kept in sync
// manually since both sides need the exact same 24 hourly slot strings.
export const TIME_SLOTS = [
  '00:00 - 01:00',
  '01:00 - 02:00',
  '02:00 - 03:00',
  '03:00 - 04:00',
  '04:00 - 05:00',
  '05:00 - 06:00',
  '06:00 - 07:00',
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
  '20:00 - 21:00',
  '21:00 - 22:00',
  '22:00 - 23:00',
  '23:00 - 00:00',
];

// Returns the list of consecutive slot strings starting at `startSlot` for
// `duration` hours, or null if it would run past the end of the day.
export function getConsecutiveSlots(startSlot: string, duration: number): string[] | null {
  const startIndex = TIME_SLOTS.indexOf(startSlot);
  if (startIndex === -1) return null;
  if (startIndex + duration > TIME_SLOTS.length) return null;
  return TIME_SLOTS.slice(startIndex, startIndex + duration);
}

export const MAX_BOOKING_HOURS = 4;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The business runs on IST; "today" must not flip at UTC midnight (5:30am IST).
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function currentMonthIST(): string {
  return todayIST().substring(0, 7); // YYYY-MM
}

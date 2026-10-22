import { DateTime } from 'luxon';

export function appZone(): string {
  return process.env.APP_TIMEZONE || 'Europe/Belgrade';
}

export function zoned(value: Date): DateTime {
  return DateTime.fromJSDate(value, { zone: 'utc' }).setZone(appZone());
}

export function parseSlotStart(date: string, startTime: string): DateTime {
  const time = startTime.slice(0, 5);
  return DateTime.fromISO(`${date}T${time}`, { zone: appZone() });
}

export function formatDisplayDate(startsAt: Date): string {
  return zoned(startsAt).toFormat('ccc, LLL d');
}

export function formatDisplayTime(
  startsAt: Date,
  durationMinutes: number,
): string {
  const start = zoned(startsAt);
  const end = start.plus({ minutes: durationMinutes });
  return `${start.toFormat('HH:mm')}–${end.toFormat('HH:mm')}`;
}

export function scheduleWindow(): { from: Date; to: Date } {
  const from = DateTime.now().setZone(appZone()).startOf('day');
  return { from: from.toJSDate(), to: from.plus({ days: 22 }).toJSDate() };
}

export function hasStarted(startsAt: Date): boolean {
  return startsAt.getTime() <= Date.now();
}

export function slotEnd(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

export function whenLabel(startsAt: Date, durationMinutes: number): string {
  return `${formatDisplayDate(startsAt)} ${formatDisplayTime(startsAt, durationMinutes)}`;
}

import { DateTime } from 'luxon';

export type Interval = { start: Date; end: Date };

export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && startB < endA;
}

export type CalendarEventSpan = {
  status?: string | null;
  transparency?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
};

export function eventInterval(
  event: CalendarEventSpan,
  zone: string,
): Interval | null {
  if (event.status === 'cancelled' || event.transparency === 'transparent') {
    return null;
  }

  const timedStart = event.start?.dateTime;
  const timedEnd = event.end?.dateTime;
  if (timedStart && timedEnd) {
    const start = new Date(timedStart);
    const end = new Date(timedEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    return { start, end };
  }

  const dayStart = event.start?.date;
  const dayEnd = event.end?.date;
  if (!dayStart || !dayEnd) {
    return null;
  }

  const start = DateTime.fromISO(dayStart, { zone }).startOf('day');
  const end = DateTime.fromISO(dayEnd, { zone }).startOf('day');
  if (!start.isValid || !end.isValid) {
    return null;
  }
  return { start: start.toJSDate(), end: end.toJSDate() };
}

export function overlapsAny(
  start: Date,
  end: Date,
  intervals: Interval[],
): boolean {
  return intervals.some((interval) =>
    intervalsOverlap(start, end, interval.start, interval.end),
  );
}

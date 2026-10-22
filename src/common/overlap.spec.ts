import { DateTime } from 'luxon';
import { eventInterval, intervalsOverlap } from './overlap';

describe('intervalsOverlap', () => {
  const start = new Date('2026-11-03T16:00:00.000Z');
  const end = new Date('2026-11-03T17:00:00.000Z');

  it('detects a partial overlap', () => {
    expect(
      intervalsOverlap(
        start,
        end,
        new Date('2026-11-03T16:30:00.000Z'),
        new Date('2026-11-03T17:30:00.000Z'),
      ),
    ).toBe(true);
  });

  it('treats a touching boundary as free', () => {
    expect(
      intervalsOverlap(start, end, end, new Date('2026-11-03T18:00:00.000Z')),
    ).toBe(false);
  });
});

describe('eventInterval', () => {
  const zone = 'Europe/Belgrade';

  it('blocks the local day of an all-day event and frees the exclusive end date', () => {
    const interval = eventInterval(
      { start: { date: '2026-11-03' }, end: { date: '2026-11-04' } },
      zone,
    );
    expect(interval).not.toBeNull();
    if (!interval) {
      return;
    }

    const during = DateTime.fromISO('2026-11-03T18:00', { zone }).toJSDate();
    const duringEnd = DateTime.fromISO('2026-11-03T19:00', { zone }).toJSDate();
    const nextDay = DateTime.fromISO('2026-11-04T18:00', { zone }).toJSDate();
    const nextDayEnd = DateTime.fromISO('2026-11-04T19:00', {
      zone,
    }).toJSDate();

    expect(
      intervalsOverlap(during, duringEnd, interval.start, interval.end),
    ).toBe(true);
    expect(
      intervalsOverlap(nextDay, nextDayEnd, interval.start, interval.end),
    ).toBe(false);
  });

  it('skips cancelled and transparent events', () => {
    const timed = {
      start: { dateTime: '2026-11-03T10:00:00+01:00' },
      end: { dateTime: '2026-11-03T11:00:00+01:00' },
    };
    expect(eventInterval({ status: 'cancelled', ...timed }, zone)).toBeNull();
    expect(
      eventInterval({ transparency: 'transparent', ...timed }, zone),
    ).toBeNull();
  });
});

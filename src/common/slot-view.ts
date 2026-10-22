import { overlapsAny, type Interval } from './overlap';
import {
  formatDisplayDate,
  formatDisplayTime,
  hasStarted,
  slotEnd,
} from './time';

export type SlotState = 'open' | 'booked' | 'busy' | 'past';

export type SlotRecord = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
};

export type SlotView = {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  endsAt: string;
  state: SlotState;
  displayDate: string;
  displayTime: string;
};

export function presentSlot(
  slot: SlotRecord,
  booked: boolean,
  busy: Interval[],
): SlotView {
  const endsAt = slotEnd(slot.startsAt, slot.durationMinutes);
  let state: SlotState = 'open';
  if (hasStarted(slot.startsAt)) {
    state = 'past';
  } else if (booked) {
    state = 'booked';
  } else if (overlapsAny(slot.startsAt, endsAt, busy)) {
    state = 'busy';
  }

  return {
    id: slot.id,
    title: slot.title,
    startsAt: slot.startsAt.toISOString(),
    durationMinutes: slot.durationMinutes,
    endsAt: endsAt.toISOString(),
    state,
    displayDate: formatDisplayDate(slot.startsAt),
    displayTime: formatDisplayTime(slot.startsAt, slot.durationMinutes),
  };
}

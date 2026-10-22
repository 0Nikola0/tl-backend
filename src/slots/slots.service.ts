import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { intervalsOverlap } from '../common/overlap';
import { presentSlot, type SlotView } from '../common/slot-view';
import { parseSlotStart, scheduleWindow, slotEnd } from '../common/time';
import { CreateSlotDto } from './dto/create-slot.dto';

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

  async create(dto: CreateSlotDto): Promise<SlotView> {
    const start = parseSlotStart(dto.date, dto.startTime);
    if (!start.isValid) {
      throw new BadRequestException('Enter a real date and time');
    }
    if (start.toMillis() <= Date.now()) {
      throw new BadRequestException('Sessions have to start in the future');
    }

    const startsAt = start.toJSDate();
    const endsAt = slotEnd(startsAt, dto.durationMinutes);
    const lookback = new Date(startsAt.getTime() - 3 * 60 * 60 * 1000);
    const nearby = await this.prisma.slot.findMany({
      where: { startsAt: { gte: lookback, lt: endsAt } },
    });
    const clash = nearby.some((slot) =>
      intervalsOverlap(
        startsAt,
        endsAt,
        slot.startsAt,
        slotEnd(slot.startsAt, slot.durationMinutes),
      ),
    );
    if (clash) {
      throw new ConflictException('That time overlaps another session');
    }

    const slot = await this.prisma.slot.create({
      data: {
        title: dto.title,
        startsAt,
        durationMinutes: dto.durationMinutes,
      },
    });
    const busy = await this.calendar.busyBetween(startsAt, endsAt);
    return presentSlot(slot, false, busy ?? []);
  }

  async list(): Promise<SlotView[]> {
    const { from, to } = scheduleWindow();
    const slots = await this.prisma.slot.findMany({
      where: { startsAt: { gte: from, lt: to } },
      include: { booking: true },
      orderBy: { startsAt: 'asc' },
    });
    const busy = await this.calendar.busyBetween(from, to);
    if (busy === null) {
      throw new ServiceUnavailableException(
        'Calendar could not be checked. Try again.',
      );
    }
    return slots.map((slot) => presentSlot(slot, Boolean(slot.booking), busy));
  }

  async remove(id: string): Promise<void> {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!slot) {
      throw new NotFoundException('Session not found');
    }
    if (slot.booking) {
      throw new ConflictException('Booked sessions stay on the schedule');
    }
    await this.prisma.slot.delete({ where: { id } });
  }
}

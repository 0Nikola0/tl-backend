import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { ConfirmationService } from '../confirmation/confirmation.service';
import { overlapsAny } from '../common/overlap';
import {
  formatDisplayDate,
  formatDisplayTime,
  hasStarted,
  slotEnd,
  whenLabel,
} from '../common/time';
import { CreateBookingDto } from './dto/create-booking.dto';

type LockedSlot = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly confirmation: ConfirmationService,
  ) {}

  async create(dto: CreateBookingDto) {
    let created: {
      id: string;
      clientName: string;
      clientEmail: string;
      confirmationMessage: string;
      slot: LockedSlot;
    };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          {
            id: string;
            title: string;
            startsAt: Date | string;
            durationMinutes: number;
          }[]
        >(
          Prisma.sql`SELECT id, title, "startsAt", "durationMinutes" FROM "Slot" WHERE id = ${dto.slotId} FOR UPDATE`,
        );
        const row = rows[0];
        if (!row) {
          throw new NotFoundException('Session not found');
        }
        const slot: LockedSlot = {
          id: row.id,
          title: row.title,
          startsAt: asDate(row.startsAt),
          durationMinutes: row.durationMinutes,
        };
        const existing = await tx.booking.findUnique({
          where: { slotId: slot.id },
        });
        if (existing) {
          throw new ConflictException('That session is already booked');
        }
        if (hasStarted(slot.startsAt)) {
          throw new ConflictException('That session has already started');
        }
        const end = slotEnd(slot.startsAt, slot.durationMinutes);
        const busy = await this.calendar.busyBetween(slot.startsAt, end, tx);
        if (busy === null) {
          throw new ServiceUnavailableException(
            'Calendar could not be checked. Try again.',
          );
        }
        if (overlapsAny(slot.startsAt, end, busy)) {
          throw new ConflictException('The trainer is busy then');
        }
        const message = this.confirmation.fallback(
          dto.clientName,
          whenLabel(slot.startsAt, slot.durationMinutes),
          slot.title,
        );
        const booking = await tx.booking.create({
          data: {
            slotId: slot.id,
            clientName: dto.clientName,
            clientEmail: dto.clientEmail,
            confirmationMessage: message,
          },
        });
        return {
          id: booking.id,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          confirmationMessage: booking.confirmationMessage,
          slot,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('That session is already booked');
      }
      throw error;
    }

    const when = whenLabel(created.slot.startsAt, created.slot.durationMinutes);
    const generated = await this.confirmation.generate({
      clientName: created.clientName,
      title: created.slot.title,
      when,
      durationMinutes: created.slot.durationMinutes,
    });
    const confirmationMessage = generated ?? created.confirmationMessage;
    if (generated && generated !== created.confirmationMessage) {
      await this.prisma.booking.update({
        where: { id: created.id },
        data: { confirmationMessage: generated },
      });
    }

    return {
      id: created.id,
      clientName: created.clientName,
      clientEmail: created.clientEmail,
      confirmationMessage,
      slot: {
        id: created.slot.id,
        title: created.slot.title,
        startsAt: created.slot.startsAt.toISOString(),
        durationMinutes: created.slot.durationMinutes,
        displayDate: formatDisplayDate(created.slot.startsAt),
        displayTime: formatDisplayTime(
          created.slot.startsAt,
          created.slot.durationMinutes,
        ),
      },
    };
  }

  async list() {
    const bookings = await this.prisma.booking.findMany({
      include: { slot: true },
      orderBy: { slot: { startsAt: 'asc' } },
    });
    return {
      bookings: bookings.map((booking) => ({
        id: booking.id,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        confirmationMessage: booking.confirmationMessage,
        createdAt: booking.createdAt.toISOString(),
        slot: {
          id: booking.slot.id,
          title: booking.slot.title,
          startsAt: booking.slot.startsAt.toISOString(),
          durationMinutes: booking.slot.durationMinutes,
          displayDate: formatDisplayDate(booking.slot.startsAt),
          displayTime: formatDisplayTime(
            booking.slot.startsAt,
            booking.slot.durationMinutes,
          ),
        },
      })),
    };
  }
}

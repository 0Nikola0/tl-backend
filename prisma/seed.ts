import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();
const zone = process.env.APP_TIMEZONE || 'Europe/Belgrade';

const plan = [
  { day: 1, hour: 7, minute: 0, title: 'Lower-body strength', durationMinutes: 60 },
  { day: 1, hour: 18, minute: 0, title: 'Conditioning', durationMinutes: 45 },
  { day: 2, hour: 12, minute: 0, title: 'Mobility', durationMinutes: 45 },
  { day: 3, hour: 7, minute: 30, title: 'Upper-body strength', durationMinutes: 60 },
  { day: 4, hour: 17, minute: 0, title: 'Conditioning', durationMinutes: 30 },
  { day: 5, hour: 9, minute: 0, title: 'Lower-body strength', durationMinutes: 60 },
  { day: 6, hour: 11, minute: 0, title: 'Mobility', durationMinutes: 45 },
];

async function main() {
  const existing = await prisma.slot.count();
  if (existing > 0) {
    return;
  }
  const today = DateTime.now().setZone(zone).startOf('day');
  await prisma.slot.createMany({
    data: plan.map((session) => ({
      title: session.title,
      durationMinutes: session.durationMinutes,
      startsAt: today
        .plus({ days: session.day })
        .set({ hour: session.hour, minute: session.minute })
        .toJSDate(),
    })),
  });
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

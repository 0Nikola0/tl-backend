import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StudioModule } from './studio/studio.module';
import { SlotsModule } from './slots/slots.module';
import { BookingsModule } from './bookings/bookings.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConfirmationModule } from './confirmation/confirmation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StudioModule,
    SlotsModule,
    BookingsModule,
    CalendarModule,
    ConfirmationModule,
  ],
})
export class AppModule {}

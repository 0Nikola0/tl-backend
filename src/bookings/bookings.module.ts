import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [CalendarModule, ConfirmationModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}

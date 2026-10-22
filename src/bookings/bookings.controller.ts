import { Body, Controller, Get, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list() {
    return this.bookings.list();
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }
}

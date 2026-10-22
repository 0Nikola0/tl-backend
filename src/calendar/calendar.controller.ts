import { Controller, Delete, Get, HttpCode, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('status')
  status() {
    return this.calendar.status();
  }

  @Get('auth-url')
  authUrl() {
    return { url: this.calendar.authUrl() };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Res() res: Response,
  ) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!code) {
      res.redirect(`${frontend}/host?calendar=error`);
      return;
    }
    try {
      await this.calendar.connect(code);
      res.redirect(`${frontend}/host?calendar=connected`);
    } catch {
      res.redirect(`${frontend}/host?calendar=error`);
    }
  }

  @Delete()
  @HttpCode(204)
  disconnect() {
    return this.calendar.disconnect();
  }
}

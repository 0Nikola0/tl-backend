import { Controller, Get } from '@nestjs/common';

@Controller('studio')
export class StudioController {
  @Get()
  get() {
    return {
      studioName: process.env.STUDIO_NAME || 'Fitness Time',
      trainerName: process.env.TRAINER_NAME || 'Maya Alvarez',
      trainerTitle: process.env.TRAINER_TITLE || 'Strength coach',
      timezone: process.env.APP_TIMEZONE || 'Europe/Belgrade',
    };
  }
}

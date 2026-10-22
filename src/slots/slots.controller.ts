import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { CreateSlotDto } from './dto/create-slot.dto';
import { SlotsService } from './slots.service';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  async list() {
    return { slots: await this.slots.list() };
  }

  @Post()
  create(@Body() dto: CreateSlotDto) {
    return this.slots.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.slots.remove(id);
  }
}

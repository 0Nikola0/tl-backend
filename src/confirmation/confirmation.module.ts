import { Module } from '@nestjs/common';
import { ConfirmationService } from './confirmation.service';

@Module({
  providers: [ConfirmationService],
  exports: [ConfirmationService],
})
export class ConfirmationModule {}

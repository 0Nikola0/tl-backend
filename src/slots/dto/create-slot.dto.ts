import { Transform, Type } from 'class-transformer';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const DURATIONS = [30, 45, 60, 90];

export class CreateSlotDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must look like YYYY-MM-DD',
  })
  date: string;

  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'Start time must look like HH:mm',
  })
  startTime: string;

  @Type(() => Number)
  @IsIn(DURATIONS, {
    message: 'Duration must be 30, 45, 60, or 90 minutes',
  })
  durationMinutes: number;
}

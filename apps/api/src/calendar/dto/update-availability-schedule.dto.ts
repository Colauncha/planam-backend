import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class TimeRangeDto {
  @IsString()
  start: string; // "HH:mm", e.g. "21:00"

  @IsString()
  end: string;
}

class WeeklyAvailabilityDayDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  ranges: TimeRangeDto[];
}

export class UpdateAvailabilityScheduleDto {
  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WeeklyAvailabilityDayDto)
  days: WeeklyAvailabilityDayDto[];
}

import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EventType } from '@planam/shared';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventType)
  eventType: EventType;

  @IsDateString()
  eventDate: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}

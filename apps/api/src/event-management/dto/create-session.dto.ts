import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EventSessionType } from '@planam/shared';

export class CreateSessionDto {
  @IsEnum(EventSessionType)
  type: EventSessionType;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsDateString()
  startTime: string;
}

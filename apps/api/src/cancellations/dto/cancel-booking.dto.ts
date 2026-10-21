import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @IsBoolean()
  confirm: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

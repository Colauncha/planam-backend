import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBookingDetailsDto {
  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  serviceDurationHours?: number;
}

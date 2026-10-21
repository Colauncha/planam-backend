import { IsEnum } from 'class-validator';
import { BookingStatus } from '@planam/shared';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;
}

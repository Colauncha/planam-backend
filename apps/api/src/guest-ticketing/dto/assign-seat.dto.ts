import { IsOptional, IsString } from 'class-validator';

export class AssignSeatDto {
  @IsOptional()
  @IsString()
  seatingHall?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  seatNumber?: string;
}

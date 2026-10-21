import { IsDateString } from 'class-validator';

export class BlockDateDto {
  @IsDateString()
  date: string;
}

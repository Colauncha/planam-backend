import { IsNotEmpty, IsString } from 'class-validator';

export class AddTicketMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}

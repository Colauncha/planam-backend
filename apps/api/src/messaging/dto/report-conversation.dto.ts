import { IsNotEmpty, IsString } from 'class-validator';

export class ReportConversationDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}

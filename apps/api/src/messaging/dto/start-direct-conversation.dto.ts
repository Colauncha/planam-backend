import { IsNotEmpty, IsString } from 'class-validator';

export class StartDirectConversationDto {
  @IsNotEmpty()
  @IsString()
  recipientUserId: string;
}

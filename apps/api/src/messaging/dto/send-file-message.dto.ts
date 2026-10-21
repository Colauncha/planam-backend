import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SendFileMessageDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsIn(['IMAGE', 'DOCUMENT'])
  type: 'IMAGE' | 'DOCUMENT';
}

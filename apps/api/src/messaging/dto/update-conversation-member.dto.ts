import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConversationMemberDto {
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  markedUnread?: boolean;
}

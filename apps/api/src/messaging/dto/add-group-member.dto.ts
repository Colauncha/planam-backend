import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddGroupMemberDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  displayRole?: string;

  @IsOptional()
  @IsBoolean()
  isFacilitator?: boolean;
}

import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateRecoveryDto {
  @IsOptional()
  @IsEmail()
  recoveryEmail?: string;

  @IsOptional()
  @IsString()
  recoveryPhone?: string;
}

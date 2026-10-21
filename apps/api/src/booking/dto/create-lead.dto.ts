import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsString()
  vendorProfileId: string;

  @IsOptional()
  @IsString()
  message?: string;
}

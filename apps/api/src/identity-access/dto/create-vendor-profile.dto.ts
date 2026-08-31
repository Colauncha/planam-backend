import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VendorCategory } from '@planam/shared';

export class CreateVendorProfileDto {
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @IsEnum(VendorCategory)
  category: VendorCategory;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

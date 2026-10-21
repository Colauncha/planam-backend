import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsIn,
  IsArray,
  IsBoolean,
} from 'class-validator';
import {
  VendorCategory,
  PricingStructure,
  PastEventType,
} from '@planam/shared';

const EXPERIENCE_RANGES = [
  '<1 year',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

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
  @IsIn(EXPERIENCE_RANGES)
  yearsOfExperience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsEnum(PricingStructure)
  pricingStructure?: PricingStructure;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(PastEventType, { each: true })
  pastEventTypes?: PastEventType[];

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  teamSize?: string;

  @IsOptional()
  @IsBoolean()
  isAcceptingBookings?: boolean;
}

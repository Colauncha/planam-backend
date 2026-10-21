import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsEnum,
} from 'class-validator';
import { PricingType } from '@planam/shared';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  serviceDurationHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCapacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includes?: string[];

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  negotiablePrice?: number;

  //@IsOptional()
  //// @IsEnum(['PER_GUEST', 'FLAT_RATE'])
  //@IsEnum(pric)
  //pricingType?: 'PER_GUEST' | 'FLAT_RATE';

  @IsOptional()
  @IsEnum(PricingType)
  pricingType?: PricingType;
}

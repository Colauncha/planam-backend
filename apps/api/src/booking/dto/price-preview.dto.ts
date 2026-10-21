import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class AddOnSelectionDto {
  @IsUUID()
  vendorAddOnId: string;

  // ignored for PER_GUEST add-ons, which always use the guest count
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class PricePreviewDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  vendorProfileId: string;

  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnSelectionDto)
  addOns?: AddOnSelectionDto[];

  // defaults to the event's guestCapacity
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;
}

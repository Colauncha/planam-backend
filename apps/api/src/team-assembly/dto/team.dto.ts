import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AddOnSelectionDto } from '../../booking/dto/price-preview.dto';

export class SetTeamSlotDto {
  @IsUUID()
  vendorProfileId: string;

  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnSelectionDto)
  addOns?: AddOnSelectionDto[];
}

export class BookTeamDto {
  @IsBoolean()
  acceptTerms: boolean;
}

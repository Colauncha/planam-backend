import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { VendorCategory } from '@planam/shared';

export class BudgetAllocationItemDto {
  @IsEnum(VendorCategory)
  category: VendorCategory;

  @IsNumber()
  @Min(0)
  minAmount: number;

  @IsNumber()
  @Min(0)
  maxAmount: number;
}

export class SetBudgetAllocationsDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BudgetAllocationItemDto)
  allocations: BudgetAllocationItemDto[];
}

import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { BalanceDueTiming } from '@planam/shared';

export class GenerateSplitInvoicesDto {
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  depositType: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @ValidateIf((o) => o.depositType === 'PERCENTAGE')
  @IsNumber()
  @Min(0)
  depositPercentage?: number;

  @ValidateIf((o) => o.depositType === 'FIXED_AMOUNT')
  @IsNumber()
  @Min(0)
  depositFixedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsDateString()
  depositDueDate: string;

  @IsEnum(BalanceDueTiming)
  balanceDueTiming: BalanceDueTiming;

  @ValidateIf((o) => o.balanceDueTiming === 'CUSTOM_DATE')
  @IsDateString()
  balanceDueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

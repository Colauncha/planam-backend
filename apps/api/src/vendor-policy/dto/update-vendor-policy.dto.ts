import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateVendorPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  depositPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  fullRefundDaysBefore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  lateCancelDaysBefore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  midCancelPercentDue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  lateCancelPercentDue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  terms?: string;
}

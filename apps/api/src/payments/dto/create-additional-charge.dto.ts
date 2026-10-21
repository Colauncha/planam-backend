import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdditionalChargeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

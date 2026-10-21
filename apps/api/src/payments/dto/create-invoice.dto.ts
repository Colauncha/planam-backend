import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { InvoiceType } from '@planam/shared';

export class CreateInvoiceDto {
  @IsEnum(InvoiceType)
  type: InvoiceType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsArray()
  lineItems?: { description: string; amount: number }[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const ALL_STATUSES = [
  'DRAFT',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'NEGOTIATION',
  'EXPIRED', // quotes
  'PAID',
  'OVERDUE',
  'CANCELLED', // invoices
];

export class LogsQueryDto {
  @IsOptional()
  @IsIn(['QUOTE', 'INVOICE'])
  type?: 'QUOTE' | 'INVOICE';

  @IsOptional()
  @IsIn(ALL_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LeadsQueryDto {
  @IsOptional()
  @IsIn(['NEW', 'VIEWED', 'RESPONDED', 'EXPIRED'])
  status?: 'NEW' | 'VIEWED' | 'RESPONDED' | 'EXPIRED';

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

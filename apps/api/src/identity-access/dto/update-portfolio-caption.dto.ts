import { IsOptional, IsString } from 'class-validator';

export class UpdatePortfolioCaptionDto {
  @IsOptional()
  @IsString()
  caption?: string;
}

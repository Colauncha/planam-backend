import { IsBoolean } from 'class-validator';
import { PricePreviewDto } from './price-preview.dto';

export class InstantBookDto extends PricePreviewDto {
  @IsBoolean()
  acceptTerms: boolean;
}

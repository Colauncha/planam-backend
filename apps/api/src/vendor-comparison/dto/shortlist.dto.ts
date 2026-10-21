import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class AddToShortlistDto {
  @IsUUID()
  vendorProfileId: string;
}

export class ShortlistQueryDto {
  @IsOptional()
  @IsIn([
    'CATERING',
    'DECORATION',
    'PHOTOGRAPHY',
    'DJ',
    'MC',
    'VENUE_HALL',
    'OTHER',
  ])
  category?: string;
}

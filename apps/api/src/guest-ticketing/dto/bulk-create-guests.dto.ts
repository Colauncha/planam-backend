import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateGuestDto } from './create-guest.dto';

export class BulkCreateGuestsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGuestDto)
  guests: CreateGuestDto[];
}

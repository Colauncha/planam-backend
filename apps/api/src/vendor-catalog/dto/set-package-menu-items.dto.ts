import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetPackageMenuItemsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  menuItemIds: string[];
}

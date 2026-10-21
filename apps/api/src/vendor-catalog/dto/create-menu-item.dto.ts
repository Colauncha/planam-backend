import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MenuCategory } from '@planam/shared';

export class CreateMenuItemDto {
  @IsEnum(MenuCategory)
  category: MenuCategory;

  @IsNotEmpty()
  @IsString()
  name: string;
}

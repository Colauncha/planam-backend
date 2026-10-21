import { IsNotEmpty, IsString } from 'class-validator';

export class AddSubtaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;
}

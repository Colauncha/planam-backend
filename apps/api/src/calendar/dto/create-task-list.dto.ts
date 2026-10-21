import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskListDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

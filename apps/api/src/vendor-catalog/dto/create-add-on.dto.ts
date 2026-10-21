import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateAddOnDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

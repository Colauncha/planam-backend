import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddTimelineEventDto {
  @IsNotEmpty()
  @IsString()
  label: string;

  @IsNotEmpty()
  @IsString()
  time: string;

  @IsInt()
  @Min(0)
  order: number;
}

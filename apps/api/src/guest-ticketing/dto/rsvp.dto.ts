import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum RsvpChoice {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export class RsvpDto {
  @IsEnum(RsvpChoice)
  status: RsvpChoice;

  @IsOptional()
  @IsString()
  plusOneName?: string;
}

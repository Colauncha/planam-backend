import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MediaType } from '@planam/shared';

export class UploadMediaDto {
  @IsEnum(MediaType)
  type: MediaType;

  @IsOptional()
  @IsString()
  caption?: string;
}

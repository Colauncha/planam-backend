import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateQuotationDto } from './create-quotation.dto';

export class ReviseQuotationDto extends PartialType(CreateQuotationDto) {
  @IsNotEmpty()
  @IsString()
  revisionMessage: string;
}

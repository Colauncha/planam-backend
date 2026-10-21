import { IsEnum } from 'class-validator';

export enum QuotationResponse {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  NEGOTIATION = 'NEGOTIATION',
}

export class RespondQuotationDto {
  @IsEnum(QuotationResponse)
  status: QuotationResponse;
}

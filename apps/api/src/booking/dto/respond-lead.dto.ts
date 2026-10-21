import { IsEnum } from 'class-validator';

export enum LeadResponse {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export class RespondLeadDto {
  @IsEnum(LeadResponse)
  status: LeadResponse;
}

import { Controller, Get, Query } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support/faqs')
export class FaqsController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  list(@Query('category') category?: string) {
    return this.supportService.listFaqs(category);
  }
}

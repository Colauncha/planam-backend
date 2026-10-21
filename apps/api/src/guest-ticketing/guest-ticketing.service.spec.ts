import { Test, TestingModule } from '@nestjs/testing';
import { GuestTicketingService } from './guest-ticketing.service';

describe('GuestTicketingService', () => {
  let service: GuestTicketingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuestTicketingService],
    }).compile();

    service = module.get<GuestTicketingService>(GuestTicketingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GuestTicketingController } from './guest-ticketing.controller';

describe('GuestTicketingController', () => {
  let controller: GuestTicketingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestTicketingController],
    }).compile();

    controller = module.get<GuestTicketingController>(GuestTicketingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

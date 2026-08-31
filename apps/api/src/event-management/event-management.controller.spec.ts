import { Test, TestingModule } from '@nestjs/testing';
import { EventManagementController } from './event-management.controller';

describe('EventManagementController', () => {
  let controller: EventManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventManagementController],
    }).compile();

    controller = module.get<EventManagementController>(EventManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

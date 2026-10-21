import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesController } from './notification-preferences.controller';

describe('NotificationPreferencesController', () => {
  let controller: NotificationPreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferencesController],
    }).compile();

    controller = module.get<NotificationPreferencesController>(NotificationPreferencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

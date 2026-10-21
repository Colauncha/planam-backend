import { Test, TestingModule } from '@nestjs/testing';
import { MediaSharingController } from './media-sharing.controller';

describe('MediaSharingController', () => {
  let controller: MediaSharingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaSharingController],
    }).compile();

    controller = module.get<MediaSharingController>(MediaSharingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

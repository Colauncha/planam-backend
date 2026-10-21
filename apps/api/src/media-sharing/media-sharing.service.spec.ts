import { Test, TestingModule } from '@nestjs/testing';
import { MediaSharingService } from './media-sharing.service';

describe('MediaSharingService', () => {
  let service: MediaSharingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaSharingService],
    }).compile();

    service = module.get<MediaSharingService>(MediaSharingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CancellationsService } from './cancellations.service';

describe('CancellationsService', () => {
  let service: CancellationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CancellationsService],
    }).compile();

    service = module.get<CancellationsService>(CancellationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

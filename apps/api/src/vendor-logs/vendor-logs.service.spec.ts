import { Test, TestingModule } from '@nestjs/testing';
import { VendorLogsService } from './vendor-logs.service';

describe('VendorLogsService', () => {
  let service: VendorLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorLogsService],
    }).compile();

    service = module.get<VendorLogsService>(VendorLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

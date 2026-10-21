import { Test, TestingModule } from '@nestjs/testing';
import { VendorComparisonService } from './vendor-comparison.service';

describe('VendorComparisonService', () => {
  let service: VendorComparisonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorComparisonService],
    }).compile();

    service = module.get<VendorComparisonService>(VendorComparisonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

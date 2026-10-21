import { Test, TestingModule } from '@nestjs/testing';
import { VendorAvailabilityService } from './vendor-availability.service';

describe('VendorAvailabilityService', () => {
  let service: VendorAvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorAvailabilityService],
    }).compile();

    service = module.get<VendorAvailabilityService>(VendorAvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

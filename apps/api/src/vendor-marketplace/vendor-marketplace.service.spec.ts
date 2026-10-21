import { Test, TestingModule } from '@nestjs/testing';
import { VendorMarketplaceService } from './vendor-marketplace.service';

describe('VendorMarketplaceService', () => {
  let service: VendorMarketplaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorMarketplaceService],
    }).compile();

    service = module.get<VendorMarketplaceService>(VendorMarketplaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

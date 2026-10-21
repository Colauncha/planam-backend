import { Test, TestingModule } from '@nestjs/testing';
import { VendorCatalogService } from './vendor-catalog.service';

describe('VendorCatalogService', () => {
  let service: VendorCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorCatalogService],
    }).compile();

    service = module.get<VendorCatalogService>(VendorCatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

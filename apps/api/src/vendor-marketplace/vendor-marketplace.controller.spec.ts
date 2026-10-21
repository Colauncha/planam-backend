import { Test, TestingModule } from '@nestjs/testing';
import { VendorMarketplaceController } from './vendor-marketplace.controller';

describe('VendorMarketplaceController', () => {
  let controller: VendorMarketplaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorMarketplaceController],
    }).compile();

    controller = module.get<VendorMarketplaceController>(VendorMarketplaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

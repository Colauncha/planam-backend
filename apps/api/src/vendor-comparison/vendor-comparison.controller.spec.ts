import { Test, TestingModule } from '@nestjs/testing';
import { VendorComparisonController } from './vendor-comparison.controller';

describe('VendorComparisonController', () => {
  let controller: VendorComparisonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorComparisonController],
    }).compile();

    controller = module.get<VendorComparisonController>(VendorComparisonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { VendorAvailabilityController } from './vendor-availability.controller';

describe('VendorAvailabilityController', () => {
  let controller: VendorAvailabilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorAvailabilityController],
    }).compile();

    controller = module.get<VendorAvailabilityController>(VendorAvailabilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

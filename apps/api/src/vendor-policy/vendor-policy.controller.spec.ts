import { Test, TestingModule } from '@nestjs/testing';
import { VendorPolicyController } from './vendor-policy.controller';

describe('VendorPolicyController', () => {
  let controller: VendorPolicyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorPolicyController],
    }).compile();

    controller = module.get<VendorPolicyController>(VendorPolicyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

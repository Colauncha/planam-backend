import { Test, TestingModule } from '@nestjs/testing';
import { VendorPolicyService } from './vendor-policy.service';

describe('VendorPolicyService', () => {
  let service: VendorPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorPolicyService],
    }).compile();

    service = module.get<VendorPolicyService>(VendorPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

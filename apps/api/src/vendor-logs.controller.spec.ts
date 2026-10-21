import { Test, TestingModule } from '@nestjs/testing';
import { VendorLogsController } from './vendor-logs.controller';

describe('VendorLogsController', () => {
  let controller: VendorLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorLogsController],
    }).compile();

    controller = module.get<VendorLogsController>(VendorLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

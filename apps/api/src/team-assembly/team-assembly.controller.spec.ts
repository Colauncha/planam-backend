import { Test, TestingModule } from '@nestjs/testing';
import { TeamAssemblyController } from './team-assembly.controller';

describe('TeamAssemblyController', () => {
  let controller: TeamAssemblyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamAssemblyController],
    }).compile();

    controller = module.get<TeamAssemblyController>(TeamAssemblyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

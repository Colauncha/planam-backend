import { Test, TestingModule } from '@nestjs/testing';
import { TeamAssemblyService } from './team-assembly.service';

describe('TeamAssemblyService', () => {
  let service: TeamAssemblyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamAssemblyService],
    }).compile();

    service = module.get<TeamAssemblyService>(TeamAssemblyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

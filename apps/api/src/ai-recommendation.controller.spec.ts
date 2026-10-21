import { Test, TestingModule } from '@nestjs/testing';
import { AiRecommendationController } from './ai-recommendation.controller';

describe('AiRecommendationController', () => {
  let controller: AiRecommendationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiRecommendationController],
    }).compile();

    controller = module.get<AiRecommendationController>(AiRecommendationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

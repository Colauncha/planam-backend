import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsFeedbackController } from './reviews-feedback.controller';

describe('ReviewsFeedbackController', () => {
  let controller: ReviewsFeedbackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsFeedbackController],
    }).compile();

    controller = module.get<ReviewsFeedbackController>(ReviewsFeedbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

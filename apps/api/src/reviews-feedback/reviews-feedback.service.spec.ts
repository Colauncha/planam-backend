import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsFeedbackService } from './reviews-feedback.service';

describe('ReviewsFeedbackService', () => {
  let service: ReviewsFeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsFeedbackService],
    }).compile();

    service = module.get<ReviewsFeedbackService>(ReviewsFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

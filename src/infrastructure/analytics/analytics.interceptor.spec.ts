import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsInterceptor } from './analytics.interceptor';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsInterceptor', () => {
  let interceptor: AnalyticsInterceptor;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    const mockAnalyticsService = {
      logRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsInterceptor,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    interceptor = module.get<AnalyticsInterceptor>(AnalyticsInterceptor);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });
});

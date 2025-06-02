import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { SessionService } from './session/session.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let sessionService: SessionService;

  beforeEach(async () => {
    const mockSessionService = {
      findSessionByToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    sessionService = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});

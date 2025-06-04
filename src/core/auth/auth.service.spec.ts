import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SessionService } from './session/session.service';
import { TfaService } from './tfa/tfa.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockSessionService = {
      createSession: jest.fn(),
      findSessionByToken: jest.fn(),
      deleteSession: jest.fn(),
      updateSession: jest.fn(),
    };

    const mockTfaService = {
      generateSecret: jest.fn(),
      verifyToken: jest.fn(),
      generateQRCode: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: TfaService,
          useValue: mockTfaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

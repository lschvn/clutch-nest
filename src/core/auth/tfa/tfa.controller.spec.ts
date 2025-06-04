import { Test, TestingModule } from '@nestjs/testing';
import { TfaController } from './tfa.controller';
import { TfaService } from './tfa.service';
import { UsersService } from '../../users/users.service';
import { SessionService } from '../session/session.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { LoginTfaDto } from '../dto/login-tfa.dto';
import { TfaCodeDto } from './dto/tfa-code.dto';
import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { Response } from 'express';

describe('TfaController', () => {
  let controller: TfaController;
  let tfaService: TfaService;
  let usersService: UsersService;
  let sessionService: SessionService;
  let cacheManager: Cache;

  // Mock user for authenticated requests
  const mockAuthenticatedUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword', // Usually not needed directly in controller tests if not used by methods
    role: 'user',
    verified: true,
    isTwoFactorAuthenticationEnabled: false, // Default to false, specific tests can override
    twoFactorAuthenticationSecret: null, // Default to null
    createdAt: new Date(),
    updatedAt: new Date(),
    sessions: [],
    bets: [],
  };

  const mockTfaService = {
    verifyEmailLoginCode: jest.fn(),
    generateTwoFactorAuthenticationSecret: jest.fn(),
    isTwoFactorCodeValid: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TfaController],
      providers: [
        { provide: TfaService, useValue: mockTfaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    controller = module.get<TfaController>(TfaController);
    tfaService = module.get<TfaService>(TfaService);
    usersService = module.get<UsersService>(UsersService);
    sessionService = module.get<SessionService>(SessionService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('authenticateTwoFactor', () => {
    const loginTfaDto: LoginTfaDto = {
      userId: 1,
      twoFactorAuthenticationCode: '123456',
    };
    const mockRequest = { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } };
    const mockUserWithTfaEnabled: User = {
      ...mockAuthenticatedUser,
      isTwoFactorAuthenticationEnabled: true,
      twoFactorAuthenticationSecret: 'SECRET_KEY',
    };

    it('should successfully authenticate with a valid code', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUserWithTfaEnabled);
      jest.spyOn(tfaService, 'verifyEmailLoginCode').mockResolvedValue(true);
      jest.spyOn(sessionService, 'createSession').mockResolvedValue('mockSessionToken');

      const result = await controller.authenticateTwoFactor(loginTfaDto, mockRequest);

      expect(result).toEqual({
        sessionToken: 'mockSessionToken',
        user: {
          id: mockUserWithTfaEnabled.id,
          email: mockUserWithTfaEnabled.email,
          name: mockUserWithTfaEnabled.name,
          role: mockUserWithTfaEnabled.role,
          verified: mockUserWithTfaEnabled.verified,
        },
      });
      expect(usersService.findOne).toHaveBeenCalledWith(loginTfaDto.userId);
      expect(tfaService.verifyEmailLoginCode).toHaveBeenCalledWith(
        loginTfaDto.userId,
        loginTfaDto.twoFactorAuthenticationCode,
      );
      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockUserWithTfaEnabled.id,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      await expect(
        controller.authenticateTwoFactor(loginTfaDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if 2FA is not enabled for the user', async () => {
      const userWith2faDisabled = { ...mockUserWithTfaEnabled, isTwoFactorAuthenticationEnabled: false };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(userWith2faDisabled);
      await expect(
        controller.authenticateTwoFactor(loginTfaDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if the 2FA code is invalid', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUserWithTfaEnabled);
      jest.spyOn(tfaService, 'verifyEmailLoginCode').mockResolvedValue(false);
      await expect(
        controller.authenticateTwoFactor(loginTfaDto, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateSecret', () => {
    const mockRequest = { user: mockAuthenticatedUser } as any;
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    it('should successfully generate a secret and return OTP Auth URL', async () => {
      const otpAuthUrl = 'otpauth://totp/YourApp:test@example.com?secret=MOCKSECRET&issuer=YourApp';
      const secret = 'MOCKSECRET';
      jest.spyOn(tfaService, 'generateTwoFactorAuthenticationSecret').mockResolvedValue({ otpauthUrl, secret });
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await controller.generateSecret(mockRequest, mockResponse);

      expect(tfaService.generateTwoFactorAuthenticationSecret).toHaveBeenCalledWith(mockAuthenticatedUser);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `2fa_secret_${mockAuthenticatedUser.id}`,
        secret,
        300,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ otpauthUrl });
    });
  });

  describe('turnOnTwoFactorAuthentication', () => {
    const tfaCodeDto: TfaCodeDto = { twoFactorAuthenticationCode: '123456' };
    const mockRequest = { user: mockAuthenticatedUser } as any;
    const tempSecret = 'TEMPSECRET';

    it('should successfully turn on 2FA', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(tempSecret);
      jest.spyOn(tfaService, 'isTwoFactorCodeValid').mockReturnValue(true);
      jest.spyOn(usersService, 'update').mockResolvedValue(undefined); // Assuming update returns void or similar
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await controller.turnOnTwoFactorAuthentication(mockRequest, tfaCodeDto);

      expect(result).toEqual({ message: 'Two-factor authentication has been enabled successfully.' });
      expect(cacheManager.get).toHaveBeenCalledWith(`2fa_secret_${mockAuthenticatedUser.id}`);
      expect(tfaService.isTwoFactorCodeValid).toHaveBeenCalledWith(tfaCodeDto.twoFactorAuthenticationCode, tempSecret);
      expect(usersService.update).toHaveBeenCalledWith(mockAuthenticatedUser.id, {
        twoFactorAuthenticationSecret: tempSecret,
        isTwoFactorAuthenticationEnabled: true,
      });
      expect(cacheManager.del).toHaveBeenCalledWith(`2fa_secret_${mockAuthenticatedUser.id}`);
    });

    it('should throw BadRequestException if temporary secret not found', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      await expect(
        controller.turnOnTwoFactorAuthentication(mockRequest, tfaCodeDto),
      ).rejects.toThrow(new BadRequestException('2FA secret expired or not found. Please try generating a new QR code.'));
    });

    it('should throw BadRequestException if 2FA code is invalid', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(tempSecret);
      jest.spyOn(tfaService, 'isTwoFactorCodeValid').mockReturnValue(false);
      await expect(
        controller.turnOnTwoFactorAuthentication(mockRequest, tfaCodeDto),
      ).rejects.toThrow(new BadRequestException('Invalid two-factor authentication code.'));
    });
  });

  describe('turnOffTwoFactorAuthentication', () => {
    const tfaCodeDto: TfaCodeDto = { twoFactorAuthenticationCode: '123456' };
    const mockRequest = { user: mockAuthenticatedUser } as any;
    const userWithTfaEnabled: User = {
      ...mockAuthenticatedUser,
      isTwoFactorAuthenticationEnabled: true,
      twoFactorAuthenticationSecret: 'USER_SECRET',
    };

    it('should successfully turn off 2FA', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(userWithTfaEnabled);
      jest.spyOn(tfaService, 'isTwoFactorCodeValid').mockReturnValue(true);
      jest.spyOn(usersService, 'update').mockResolvedValue(undefined);

      const result = await controller.turnOffTwoFactorAuthentication(mockRequest, tfaCodeDto);

      expect(result).toEqual({ message: 'Two-factor authentication has been disabled successfully.' });
      expect(usersService.findOne).toHaveBeenCalledWith(mockAuthenticatedUser.id);
      expect(tfaService.isTwoFactorCodeValid).toHaveBeenCalledWith(
        tfaCodeDto.twoFactorAuthenticationCode,
        userWithTfaEnabled.twoFactorAuthenticationSecret,
      );
      expect(usersService.update).toHaveBeenCalledWith(mockAuthenticatedUser.id, {
        twoFactorAuthenticationSecret: null,
        isTwoFactorAuthenticationEnabled: false,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      await expect(
        controller.turnOffTwoFactorAuthentication(mockRequest, tfaCodeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if 2FA is not enabled', async () => {
      const userWithTfaDisabled = { ...mockAuthenticatedUser, isTwoFactorAuthenticationEnabled: false, twoFactorAuthenticationSecret: null };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(userWithTfaDisabled);
      await expect(
        controller.turnOffTwoFactorAuthentication(mockRequest, tfaCodeDto),
      ).rejects.toThrow(new BadRequestException('Two-factor authentication is not currently enabled for this account.'));
    });

    it('should throw BadRequestException if 2FA is enabled but secret is missing (data inconsistency)', async () => {
      const userWithTfaEnabledNoSecret = { ...mockAuthenticatedUser, isTwoFactorAuthenticationEnabled: true, twoFactorAuthenticationSecret: null };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(userWithTfaEnabledNoSecret);
       await expect(
        controller.turnOffTwoFactorAuthentication(mockRequest, tfaCodeDto),
      ).rejects.toThrow(new BadRequestException('Two-factor authentication is not currently enabled for this account.'));
    });

    it('should throw BadRequestException if 2FA code is invalid', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(userWithTfaEnabled);
      jest.spyOn(tfaService, 'isTwoFactorCodeValid').mockReturnValue(false);
      await expect(
        controller.turnOffTwoFactorAuthentication(mockRequest, tfaCodeDto),
      ).rejects.toThrow(new BadRequestException('Invalid two-factor authentication code.'));
    });
  });
});

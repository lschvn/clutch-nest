import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session/session.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetPasswordDto } from './dto/verify-reset-password.dto';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BadRequestException, UnauthorizedException, HttpStatus, NotFoundException } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;
  let configService: ConfigService;
  let sessionService: SessionService;
  let eventEmitter: EventEmitter2;

  const mockAuthService = {
    signIn: jest.fn(),
    signUp: jest.fn(),
    generateResetToken: jest.fn(),
    verifyResetToken: jest.fn(),
    deleteResetToken: jest.fn(),
  };

  const mockUsersService = {
    getByEmail: jest.fn(),
    updatePassword: jest.fn(),
    update: jest.fn(), // Added for verifyEmail
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSessionService = {
    invalidateSession: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    verified: false, // Set to false for email verification tests
    password: 'hashedPassword',
    isTwoFactorAuthenticationEnabled: false,
    twoFactorAuthenticationSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sessions: [],
    bets: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
    sessionService = module.get<SessionService>(SessionService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ... existing signIn, signUp, getProfile, logout, resetPassword, verifyResetPassword tests ...

  describe('signIn', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } } as any;

    it('should successfully sign in a user and return access token and user details', async () => {
      const mockLoginResult = {
        sessionToken: 'mockSessionToken',
        user: { ...mockUser, verified: true }, // Assuming user is verified for this test
      };
      jest.spyOn(authService, 'signIn').mockResolvedValue(mockLoginResult);

      const result = await controller.signIn(loginDto, mockReq);

      expect(result).toEqual(mockLoginResult);
      expect(authService.signIn).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        mockReq.ip,
        mockReq.headers['user-agent'],
      );
    });

    it('should successfully sign in a user and return 2FA requirement', async () => {
      const mockLoginResult = {
        twoFactorRequired: true,
        userId: 1,
      };
      jest.spyOn(authService, 'signIn').mockResolvedValue(mockLoginResult);

      const result = await controller.signIn(loginDto, mockReq);

      expect(result).toEqual(mockLoginResult);
      expect(authService.signIn).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        mockReq.ip,
        mockReq.headers['user-agent'],
      );
    });

    it('should throw UnauthorizedException on login failure', async () => {
      jest.spyOn(authService, 'signIn').mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.signIn(loginDto, mockReq)).rejects.toThrow(UnauthorizedException);
      expect(authService.signIn).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        mockReq.ip,
        mockReq.headers['user-agent'],
      );
    });
  });

  describe('signUp', () => {
    const createUserDto: CreateUserDto = {
      name: 'New User',
      email: 'new@example.com',
      password: 'newPassword123',
    };
    const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } } as any;
    const mockSignedUpUser = {
        sessionToken: 'mockSessionTokenForSignUp',
        user: {
            id: 2,
            email: createUserDto.email,
            name: createUserDto.name,
            role: 'user',
            verified: false,
        } as Partial<User>,
    };

    it('should successfully register a new user and emit welcome event', async () => {
      jest.spyOn(authService, 'signUp').mockResolvedValue(mockSignedUpUser);
      const result = await controller.signUp(createUserDto, mockReq);

      expect(result).toEqual(mockSignedUpUser);
      expect(authService.signUp).toHaveBeenCalledWith(
        createUserDto.name,
        createUserDto.email,
        createUserDto.password,
        mockReq.ip,
        mockReq.headers['user-agent'],
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.welcome', {
        name: mockSignedUpUser.user.name,
        email: mockSignedUpUser.user.email,
      });
    });

    it('should throw BadRequestException on registration failure (e.g., email exists)', async () => {
      jest.spyOn(authService, 'signUp').mockRejectedValue(new BadRequestException('Email already exists'));

      await expect(controller.signUp(createUserDto, mockReq)).rejects.toThrow(BadRequestException);
      expect(authService.signUp).toHaveBeenCalledWith(
        createUserDto.name,
        createUserDto.email,
        createUserDto.password,
        mockReq.ip,
        mockReq.headers['user-agent'],
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return the user from the request object', () => {
      const reqWithUser = { user: mockUser } as any;
      const profile = controller.getProfile(reqWithUser);
      expect(profile).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should call sessionService.invalidateSession with the token if present', async () => {
      const mockToken = 'mocktoken123';
      const reqWithToken = { headers: { authorization: `Bearer ${mockToken}` } } as unknown as Request;
      jest.spyOn(sessionService, 'invalidateSession').mockResolvedValue(undefined);
      await controller.logout(reqWithToken);
      expect(sessionService.invalidateSession).toHaveBeenCalledWith(mockToken);
    });

    it('should not call sessionService.invalidateSession if authorization header is missing', async () => {
      const reqWithoutToken = { headers: {} } as unknown as Request;
      await controller.logout(reqWithoutToken);
      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });

    it('should not call sessionService.invalidateSession if authorization header is not Bearer token', async () => {
      const reqWithBadToken = { headers: { authorization: 'Basic NNN' } } as unknown as Request;
      await controller.logout(reqWithBadToken);
      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });

    it('should not call sessionService.invalidateSession if Bearer token is empty', async () => {
      const reqWithEmptyBearer = { headers: { authorization: 'Bearer ' } } as unknown as Request;
      await controller.logout(reqWithEmptyBearer);
      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });

    it('should complete even if sessionService.invalidateSession throws an error', async () => {
      const mockToken = 'mocktoken123';
      const reqWithToken = { headers: { authorization: `Bearer ${mockToken}` } } as unknown as Request;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(sessionService, 'invalidateSession').mockRejectedValue(new Error('Invalidation failed'));
      await expect(controller.logout(reqWithToken)).resolves.toBeUndefined();
      expect(sessionService.invalidateSession).toHaveBeenCalledWith(mockToken);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = { email: 'test@example.com' };

    it('should send a password reset email successfully', async () => {
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateResetToken').mockResolvedValue('mockResetToken');
      jest.spyOn(configService, 'get').mockReturnValue('http://localhost:3000');
      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual({ message: 'Password reset email sent. Please check your inbox.' });
      expect(usersService.getByEmail).toHaveBeenCalledWith(resetPasswordDto.email);
      expect(authService.generateResetToken).toHaveBeenCalledWith(resetPasswordDto.email);
      expect(configService.get).toHaveBeenCalledWith('APP_WEB_URL');
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.reset-password', {
        name: mockUser.name,
        email: mockUser.email,
        resetLink: 'http://localhost:3000/auth/reset-password?token=mockResetToken',
      });
    });

    it('should throw NotFoundException if user with email does not exist', async () => {
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(null);
      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(NotFoundException);
      expect(usersService.getByEmail).toHaveBeenCalledWith(resetPasswordDto.email);
      expect(authService.generateResetToken).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('verifyResetPassword', () => {
    const verifyDto: VerifyResetPasswordDto = { token: 'validtoken', password: 'newPassword123' };

    it('should successfully verify token, update password, and delete token', async () => {
      jest.spyOn(authService, 'verifyResetToken').mockResolvedValue(mockUser.email);
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'updatePassword').mockResolvedValue(undefined);
      jest.spyOn(authService, 'deleteResetToken').mockResolvedValue(undefined);

      const result = await controller.verifyResetPassword(verifyDto);

      expect(result).toEqual({ message: `Password for user ${mockUser.email} has been successfully reset.` });
      expect(authService.verifyResetToken).toHaveBeenCalledWith(verifyDto.token);
      expect(usersService.getByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(usersService.updatePassword).toHaveBeenCalledWith(mockUser.id, verifyDto.password);
      expect(authService.deleteResetToken).toHaveBeenCalledWith(verifyDto.token);
    });

    it('should throw NotFoundException if reset token is invalid or expired', async () => {
      jest.spyOn(authService, 'verifyResetToken').mockResolvedValue(null);
      await expect(controller.verifyResetPassword(verifyDto)).rejects.toThrow(new NotFoundException('Invalid or expired password reset token.'));
      expect(authService.verifyResetToken).toHaveBeenCalledWith(verifyDto.token);
      expect(usersService.getByEmail).not.toHaveBeenCalled();
      expect(usersService.updatePassword).not.toHaveBeenCalled();
      expect(authService.deleteResetToken).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user associated with token is not found', async () => {
      jest.spyOn(authService, 'verifyResetToken').mockResolvedValue('email.that.does.not.exist@example.com');
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(null);
      await expect(controller.verifyResetPassword(verifyDto)).rejects.toThrow(new NotFoundException('User not found.'));
      expect(authService.verifyResetToken).toHaveBeenCalledWith(verifyDto.token);
      expect(usersService.getByEmail).toHaveBeenCalledWith('email.that.does.not.exist@example.com');
      expect(usersService.updatePassword).not.toHaveBeenCalled();
      expect(authService.deleteResetToken).not.toHaveBeenCalled();
    });
  });

  describe('sendVerifiedEmail', () => {
    const sendVerificationEmailDto: SendVerificationEmailDto = { email: 'test@example.com' };

    it('should send a verification email successfully', async () => {
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateResetToken').mockResolvedValue('mockVerificationToken');
      jest.spyOn(configService, 'get').mockReturnValue('http://localhost:3000');

      const result = await controller.sendVerifiedEmail(sendVerificationEmailDto);

      expect(result).toEqual({ message: 'Verification email sent. Please check your inbox.' });
      expect(usersService.getByEmail).toHaveBeenCalledWith(sendVerificationEmailDto.email);
      expect(authService.generateResetToken).toHaveBeenCalledWith(sendVerificationEmailDto.email); // Reusing generateResetToken
      expect(configService.get).toHaveBeenCalledWith('APP_WEB_URL');
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.verify-email', {
        name: mockUser.name,
        email: mockUser.email,
        verificationLink: 'http://localhost:3000/auth/confirm-email?token=mockVerificationToken',
      });
    });

    it('should throw NotFoundException if user for verification email does not exist', async () => {
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(null);
      await expect(controller.sendVerifiedEmail(sendVerificationEmailDto)).rejects.toThrow(NotFoundException);
      expect(usersService.getByEmail).toHaveBeenCalledWith(sendVerificationEmailDto.email);
      expect(authService.generateResetToken).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = { token: 'validVerificationToken' };

    it('should successfully verify email, update user, and delete token', async () => {
      jest.spyOn(authService, 'verifyResetToken').mockResolvedValue(mockUser.email); // Reusing verifyResetToken
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'update').mockResolvedValue(undefined); // Assuming User entity or partial update
      jest.spyOn(authService, 'deleteResetToken').mockResolvedValue(undefined); // Reusing deleteResetToken

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result).toEqual({ message: `Email for user ${mockUser.email} has been successfully verified.` });
      expect(authService.verifyResetToken).toHaveBeenCalledWith(verifyEmailDto.token);
      expect(usersService.getByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, { verified: true });
      expect(authService.deleteResetToken).toHaveBeenCalledWith(verifyEmailDto.token);
    });

    it('should throw NotFoundException if verification token is invalid or expired', async () => {
      jest.spyOn(authService, 'verifyResetToken').mockResolvedValue(null);
      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(new NotFoundException('Invalid or expired email verification token.'));
      expect(authService.verifyResetToken).toHaveBeenCalledWith(verifyEmailDto.token);
      expect(usersService.getByEmail).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
      expect(authService.deleteResetToken).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user for verification token is not found', async () => {
      jest.spyOn(authService, 'verifyResetToken').mockResolvedValue('unverified.user@example.com');
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(null);
      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(new NotFoundException('User not found.'));
      expect(authService.verifyResetToken).toHaveBeenCalledWith(verifyEmailDto.token);
      expect(usersService.getByEmail).toHaveBeenCalledWith('unverified.user@example.com');
      expect(usersService.update).not.toHaveBeenCalled();
      expect(authService.deleteResetToken).not.toHaveBeenCalled();
    });
  });
});

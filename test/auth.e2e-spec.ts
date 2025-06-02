import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  CanActivate,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/core/auth/auth.service';
import { UsersService } from '../src/core/users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../src/core/auth/auth.guard';

describe('Auth End-to-End Tests', () => {
  let app: INestApplication;

  const mockAuthService = {
    signIn: jest.fn().mockResolvedValue({ accessToken: 'token' }),
    signUp: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    }),
    generateResetToken: jest.fn().mockResolvedValue('reset-token'),
    verifyResetToken: jest.fn().mockResolvedValue('test@example.com'),
  };

  const mockUsersService = {
    getByEmail: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    }),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = { emit: jest.fn() };
  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  class MockAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 1, name: 'Test User', email: 'test@example.com' };
      return true;
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(EventEmitter2)
      .useValue(mockEventEmitter)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/POST auth/register (201)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
      })
      .expect(HttpStatus.CREATED)
      .expect({ id: 1, name: 'Test User', email: 'test@example.com' });
  });

  it('/POST auth/login (200)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(HttpStatus.OK)
      .expect({ accessToken: 'token' });
  });

  it('/GET auth/profile (200)', () => {
    return request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', 'Bearer token')
      .expect(HttpStatus.OK)
      .expect({ id: 1, name: 'Test User', email: 'test@example.com' });
  });

  it('/POST auth/reset-password/send (200)', () => {
    return request(app.getHttpServer())
      .post('/auth/reset-password/send')
      .send({ email: 'test@example.com' })
      .expect(HttpStatus.OK)
      .expect({
        message:
          'If your email address is in our database, you will receive a password reset link shortly.',
      });
  });

  it('/POST auth/reset-password/send - not found (404)', () => {
    mockUsersService.getByEmail.mockResolvedValueOnce(null);
    return request(app.getHttpServer())
      .post('/auth/reset-password/send')
      .send({ email: 'unknown@example.com' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('/POST auth/reset-password/verify (200)', () => {
    return request(app.getHttpServer())
      .post('/auth/reset-password/verify')
      .send({ token: 'reset-token', password: 'newpassword' })
      .expect(HttpStatus.OK)
      .expect({ message: 'Password reset successfully.' });
  });

  it('/POST auth/reset-password/verify - invalid token (404)', () => {
    mockAuthService.verifyResetToken.mockResolvedValueOnce(null);
    return request(app.getHttpServer())
      .post('/auth/reset-password/verify')
      .send({ token: 'invalid', password: 'newpassword' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('/POST auth/reset-password/verify - user not found (404)', () => {
    mockAuthService.verifyResetToken.mockResolvedValueOnce(
      'notfound@example.com',
    );
    mockUsersService.getByEmail.mockResolvedValueOnce(null);
    return request(app.getHttpServer())
      .post('/auth/reset-password/verify')
      .send({ token: 'reset-token', password: 'newpassword' })
      .expect(HttpStatus.NOT_FOUND);
  });
});

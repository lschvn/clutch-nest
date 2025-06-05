import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/core/users/entities/user.entity';
import { Session } from '../src/core/auth/session/entities/session.entity';

describe('Session Management (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    try {
      dataSource = moduleFixture.get<DataSource>(DataSource);
    } catch (error) {
      console.warn('DataSource could not be retrieved directly. Database cleaning might be affected.', error);
      // Attempt to retrieve DataSource with a common name if the default 'DataSource' token fails
      try {
        dataSource = moduleFixture.get<DataSource>('DATABASE_CONNECTION');
      } catch (innerError) {
        console.warn('Attempt to get DataSource with "DATABASE_CONNECTION" token also failed.', innerError);
      }
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    if (dataSource) {
      try {
        const userRepository = dataSource.getRepository(User);
        // Using query for DELETE is often more reliable in E2E if .clear() has issues with cascades or transactions
        await userRepository.query('DELETE FROM "user";');
        const sessionRepository = dataSource.getRepository(Session);
        await sessionRepository.query('DELETE FROM "session";');
        // Add more entities here if needed, e.g.:
        // await dataSource.getRepository(AnotherEntity).query('DELETE FROM "another_entity";');
      } catch (error) {
        console.error('Error during database cleaning:', error);
        console.warn('Database cleaning failed. Test isolation might be compromised.');
      }
    } else {
      console.warn('DataSource not available, skipping database cleaning. This might lead to inconsistent test results.');
      // It's critical to note that without proper DataSource injection, tests WILL NOT BE ISOLATED.
      // This placeholder comment should be replaced with actual handling or a fix for DataSource retrieval.
      console.error('CRITICAL: DATABASE CLEANING IS SKIPPED. TESTS ARE NOT ISOLATED.');
    }
  });

  it('should be defined (Session Management)', () => {
    expect(app).toBeDefined();
  });

  // Helper function for generating unique emails (if not already in a global test helper)
  const generateUniqueEmail = () => `testuser-session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;

  describe('List User Sessions (GET /auth/sessions)', () => {
    const testUserCredentials = {
      name: 'Session List User',
      email: generateUniqueEmail(),
      password: 'Password123!',
    };
    let userSessionToken: string;
    let userId: string | number; // User ID can be string (e.g. UUID) or number

    beforeEach(async () => {
      // Register the user to create an initial session
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUserCredentials)
        .expect(HttpStatus.CREATED);

      userSessionToken = registerResponse.body.sessionToken;
      // Assuming the user object from registration response is flat { id, email, name }
      // as established in auth.e2e-spec.ts implementation.
      // If it's nested under `user` like { user: { id, email, name }, sessionToken }, adjust accordingly.
      userId = registerResponse.body.id;

      if (!userSessionToken || !userId) {
        throw new Error('Failed to register user or get session token/userId for session tests setup.');
      }

      // To test multiple sessions, we could log in again.
      // For now, we'll test with the single session from registration.
      // If a second login is performed:
      // await request(app.getHttpServer())
      //   .post('/auth/login')
      //   .send({ email: testUserCredentials.email, password: testUserCredentials.password })
      //   .expect(HttpStatus.OK);
      // This would create a second session if the system allows multiple active sessions.
    });

    it('should list active sessions for the authenticated user (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${userSessionToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1); // At least the current session

      const currentSession = response.body.find(
        (session: any) => session.isCurrent === true // Assuming an 'isCurrent' flag or similar identifier
      );
      // If no 'isCurrent' flag, we might need to check based on token or other means,
      // or just verify structure of one of the sessions.
      // For now, let's assume there's at least one session and check its structure.

      const sessionToExamine = currentSession || response.body[0];

      expect(sessionToExamine).toBeDefined();
      expect(sessionToExamine.id).toBeDefined();
      expect(sessionToExamine.ipAddress).toBeDefined(); // Or null if not captured/resolved
      expect(sessionToExamine.userAgent).toBeDefined();
      expect(sessionToExamine.lastUsedAt).toBeDefined();
      expect(sessionToExamine.expiresAt).toBeDefined();
      expect(sessionToExamine.token).toBeUndefined(); // Ensure raw token is not exposed
      expect(sessionToExamine.userId).toBeUndefined(); // Ensure userId is not exposed if not intended for this DTO

      // Optional: More robust check if dataSource is available
      if (dataSource) {
        const sessionRepository = dataSource.getRepository(Session);
        const dbSessions = await sessionRepository.find({ where: { userId: userId } });
        expect(response.body.length).toEqual(dbSessions.length);
        // Further checks can compare specific details if needed, e.g., matching IDs
      }
    });

    it('should fail to list sessions without a token (401)', async () => {
      await request(app.getHttpServer())
        .get('/auth/sessions')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail to list sessions with an invalid token (401)', async () => {
      await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Revoke User Session (DELETE /auth/sessions/:sessionId)', () => {
    const mainUserCredentials = {
      name: 'Session Revoke Main User',
      email: generateUniqueEmail(),
      password: 'password123',
    };
    let mainUserToken: string;
    let mainUserId: string | number;
    let mainUserSessionIdToRevoke: string | number;

    const otherUserCredentials = {
      name: 'Session Revoke Other User',
      email: generateUniqueEmail(),
      password: 'password456',
    };
    let otherUserToken: string;
    // let otherUserId: string | number; // Not strictly needed for these tests
    let otherUserSessionId: string | number;

    beforeEach(async () => {
      // Register Main User
      const regMainResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(mainUserCredentials)
        .expect(HttpStatus.CREATED);
      mainUserToken = regMainResponse.body.sessionToken;
      // Adjust based on actual registration response structure for user ID
      mainUserId = regMainResponse.body.id || regMainResponse.body.user?.id;

      if (!mainUserToken || !mainUserId) {
        throw new Error('Setup failed for mainUser: Missing token or ID from registration.');
      }

      // Get session ID for mainUserToken to revoke later
      const sessionsMainResponse = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(HttpStatus.OK);

      if (!sessionsMainResponse.body || sessionsMainResponse.body.length === 0) {
        throw new Error('Setup failed for mainUser: No sessions found after registration.');
      }
      // Assuming the first session is the one associated with mainUserToken.
      // A more robust way might be to find the session marked as 'isCurrent' if available.
      mainUserSessionIdToRevoke = sessionsMainResponse.body[0].id;
      if(!mainUserSessionIdToRevoke) {
        throw new Error('Setup failed for mainUser: Could not determine session ID to revoke.');
      }

      // Register Other User
      const regOtherResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(otherUserCredentials)
        .expect(HttpStatus.CREATED);
      otherUserToken = regOtherResponse.body.sessionToken;
      // otherUserId = regOtherResponse.body.id || regOtherResponse.body.user?.id;

      if (!otherUserToken) {
        throw new Error('Setup failed for otherUser: Missing token from registration.');
      }

      const sessionsOtherResponse = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(HttpStatus.OK);

      if (!sessionsOtherResponse.body || sessionsOtherResponse.body.length === 0) {
        throw new Error('Setup failed for otherUser: No sessions found after registration.');
      }
      otherUserSessionId = sessionsOtherResponse.body[0].id;
       if(!otherUserSessionId) {
        throw new Error('Setup failed for otherUser: Could not determine session ID.');
      }
    });

    it('should allow a user to revoke their own session (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${mainUserSessionIdToRevoke}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify token is invalidated
      await request(app.getHttpServer())
        .get('/auth/profile') // Any protected route
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(HttpStatus.UNAUTHORIZED);

      // Optional: Verify in DB if dataSource is available
      if (dataSource) {
        const sessionRepository = dataSource.getRepository(Session);
        const revokedSession = await sessionRepository.findOneBy({ id: mainUserSessionIdToRevoke as any});
        expect(revokedSession).toBeNull(); // Or check for an 'isActive: false' flag if soft delete
      }
    });

    it("should forbid a user from revoking another user's session (403)", async () => {
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${otherUserSessionId}`) // Attempt to delete otherUser's session
        .set('Authorization', `Bearer ${mainUserToken}`) // Authenticated as mainUser
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 403 when attempting to revoke a non-existent session ID', async () => {
      // Controller logic: findOneOrFail (implicitly, as it tries to get session then checks ownership)
      // If session doesn't exist, service's getSessionById might return null,
      // then controller's ownership check or direct use would fail.
      // SessionService.revoke uses findOneOrFail, so it would be a 404 from service,
      // but controller's ownership check is primary. If session not found by ID for user, it's forbidden.
      const nonExistentSessionId = 9999999;
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${nonExistentSessionId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(HttpStatus.FORBIDDEN); // As per controller logic: Forbidden if session not found for user
    });

    it('should fail to revoke a session without a token (401)', async () => {
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${mainUserSessionIdToRevoke}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail if sessionId is not a valid format (e.g., not a number) (400)', async () => {
      await request(app.getHttpServer())
        .delete('/auth/sessions/invalidSessionIdFormat')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(HttpStatus.BAD_REQUEST); // Due to ParseIntPipe in controller
    });
  });
});

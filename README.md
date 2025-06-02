# Clutch Esport Backend API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

A robust NestJS backend API for the Clutch Esport platform, featuring comprehensive authentication, session management, two-factor authentication, and user management capabilities.

## 🚀 Features

- **Authentication & Authorization**: JWT-based session management with role-based access control
- **Two-Factor Authentication**: Email-based 2FA and authenticator app support (Google Authenticator, Authy)
- **User Management**: Complete CRUD operations with secure password handling
- **Session Management**: Multi-device session tracking and revocation
- **Email Services**: Automated email notifications for authentication flows
- **Analytics**: Request logging and user activity tracking
- **Security**: Rate limiting, request throttling, and security headers
- **API Documentation**: Comprehensive OpenAPI/Swagger documentation

## 🏗️ Architecture

### Core Modules

- **`AuthModule`** - Authentication, login, registration, password reset
- **`TwoFactorAuthModule`** - 2FA setup, verification, and management  
- **`UsersModule`** - User CRUD operations and profile management
- **`SessionModule`** - Session creation, validation, and revocation
- **`BetModule`** - Betting functionality (extensible)

### Infrastructure Modules

- **`DatabaseModule`** - PostgreSQL with TypeORM configuration
- **`MailerModule`** - Email services with template support
- **`AnalyticsModule`** - Request logging and analytics tracking

## 📋 Prerequisites

- Node.js (v18+)
- pnpm (package manager)
- PostgreSQL (v13+)
- SMTP server (for email functionality)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clutch-backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USER=clutch
   DATABASE_PASSWORD=clutch
   DATABASE_NAME=clutch

   # JWT
   JWT_SECRET=your-super-secret-jwt-key

   # SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM_ADDRESS=noreply@clutchesport.com

   # App Configuration
   APP_NAME=Clutch Esport
   APP_WEB_URL=http://localhost:3000

   # Rate Limiting
   THROTTLE_TTL=60
   THROTTLE_LIMIT=100
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb clutch
   
   # Application will auto-sync tables on startup
   ```

## 🚀 Running the Application

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run start:prod

# Debug mode
pnpm run start:debug
```

The API will be available at `http://localhost:3000`

**Swagger Documentation**: `http://localhost:3000/api`

## 🔐 Authentication System

### Authentication Flow Overview

The application implements a comprehensive authentication system with the following features:

1. **Primary Authentication** - Email/password login
2. **Two-Factor Authentication** - Optional email-based 2FA and authenticator apps
3. **Session Management** - JWT-based sessions with device tracking
4. **Password Management** - Secure reset and change functionality
5. **Email Verification** - Account verification system

### Authentication Endpoints

#### Core Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | User registration | ❌ |
| `POST` | `/auth/login` | User login | ❌ |
| `POST` | `/auth/logout` | User logout | ✅ |
| `GET` | `/auth/profile` | Get current user profile | ✅ |

#### Password Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/reset-password/send` | Send password reset link | ❌ |
| `POST` | `/auth/reset-password/verify` | Verify reset token & set new password | ❌ |

#### Email Verification

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/confirmation/send` | Send email verification link | ❌ |
| `POST` | `/auth/confirmation/verify` | Verify email with token | ❌ |

### Authentication Flow Examples

#### 1. User Registration Flow

```javascript
// Step 1: Register new user
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePassword123!'
  })
});

const { sessionToken, user } = await response.json();

// Step 2: Store session token for authenticated requests
localStorage.setItem('sessionToken', sessionToken);

// Step 3: Send verification email (optional)
await fetch('/auth/confirmation/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'john@example.com' })
});
```

#### 2. Login Flow (without 2FA)

```javascript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePassword123!'
  })
});

const result = await response.json();

if (result.sessionToken) {
  // Direct login success
  localStorage.setItem('sessionToken', result.sessionToken);
  // User is now authenticated
}
```

#### 3. Login Flow (with 2FA enabled)

```javascript
// Step 1: Initial login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePassword123!'
  })
});

const loginResult = await loginResponse.json();

if (loginResult.twoFactorRequired) {
  // Step 2: User will receive 2FA code via email
  // Step 3: Complete 2FA authentication
  const twoFactorResponse = await fetch('/auth/2fa/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: loginResult.userId,
      twoFactorAuthenticationCode: '123456' // User enters this code
    })
  });

  const { sessionToken, user } = await twoFactorResponse.json();
  localStorage.setItem('sessionToken', sessionToken);
}
```

## 🔒 Two-Factor Authentication (2FA)

### 2FA System Overview

The application supports two types of 2FA:

1. **Email-based 2FA** - 6-digit codes sent via email during login
2. **Authenticator App 2FA** - TOTP codes from apps like Google Authenticator

### 2FA Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/2fa/authenticate` | Complete 2FA login process | ❌ |
| `POST` | `/auth/2fa/generate` | Generate QR code for authenticator setup | ✅ |
| `POST` | `/auth/2fa/turn-on` | Enable 2FA with authenticator code | ✅ |
| `POST` | `/auth/2fa/turn-off` | Disable 2FA with authenticator code | ✅ |

### 2FA Setup Flow (Authenticator App)

#### Step 1: Generate QR Code

```javascript
const response = await fetch('/auth/2fa/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  }
});

const { otpauthUrl } = await response.json();

// Convert otpauthUrl to QR code for user to scan
// Use a QR code library like 'qrcode' to display to user
```

#### Step 2: User Scans QR Code

The user scans the QR code with their authenticator app (Google Authenticator, Authy, etc.)

#### Step 3: Enable 2FA

```javascript
// User enters 6-digit code from their authenticator app
const response = await fetch('/auth/2fa/turn-on', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    twoFactorAuthenticationCode: '123456' // From authenticator app
  })
});

// 2FA is now enabled for the user's account
```

### 2FA Disable Flow

```javascript
const response = await fetch('/auth/2fa/turn-off', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    twoFactorAuthenticationCode: '123456' // Current code from authenticator app
  })
});

// 2FA is now disabled
```

## 🎫 Session Management

### Session Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/auth/sessions` | List user's active sessions | ✅ |
| `DELETE` | `/auth/sessions/:sessionId` | Revoke specific session | ✅ |

### Session Management Examples

#### List Active Sessions

```javascript
const response = await fetch('/auth/sessions', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

const sessions = await response.json();
// Returns array of active sessions with device info
```

#### Revoke Session

```javascript
await fetch('/auth/sessions/123', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

// Session 123 is now revoked
```

## 👥 User Management

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/users` | List all users | ✅ |
| `GET` | `/users/:id` | Get specific user | ✅ |
| `POST` | `/users` | Create new user | ✅ |
| `PATCH` | `/users/:id` | Update user | ✅ |
| `DELETE` | `/users/:id` | Delete user | ✅ |

### User Entity Structure

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string; // Hashed with bcrypt
  role: 'user' | 'admin';
  verified: boolean; // Email verification status
  isTwoFactorAuthenticationEnabled: boolean;
  twoFactorAuthenticationSecret: string | null; // Encrypted
  createdAt: Date;
  updatedAt: Date;
}
```

## 📧 Email System

### Email Events

The system automatically sends emails for various events:

1. **Welcome Email** - After successful registration
2. **2FA Login Code** - During 2FA authentication
3. **Password Reset** - Password reset links
4. **Email Verification** - Account verification links

### Email Configuration

Configure SMTP settings in your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_ADDRESS=noreply@clutchesport.com
APP_NAME=Clutch Esport
```

## 📊 Analytics & Monitoring

### Analytics Features

- **Request Logging** - All API requests are logged with metadata
- **User Activity Tracking** - Login/logout events and user actions
- **Performance Monitoring** - Response times and error rates

### Analytics Entity

```typescript
interface Analytics {
  id: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_HOST` | PostgreSQL host | `localhost` | ✅ |
| `DATABASE_PORT` | PostgreSQL port | `5432` | ✅ |
| `DATABASE_USER` | Database username | `clutch` | ✅ |
| `DATABASE_PASSWORD` | Database password | `clutch` | ✅ |
| `DATABASE_NAME` | Database name | `clutch` | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `SMTP_HOST` | SMTP server host | - | ✅ |
| `SMTP_PORT` | SMTP server port | `587` | ✅ |
| `SMTP_USER` | SMTP username | - | ✅ |
| `SMTP_PASSWORD` | SMTP password | - | ✅ |
| `SMTP_FROM_ADDRESS` | From email address | - | ✅ |
| `APP_NAME` | Application name | `Clutch Esport` | ❌ |
| `APP_WEB_URL` | Frontend URL | `http://localhost:3000` | ❌ |
| `THROTTLE_TTL` | Rate limit window (seconds) | `60` | ❌ |
| `THROTTLE_LIMIT` | Max requests per window | `100` | ❌ |

## 🔒 Security Features

### Built-in Security

1. **Rate Limiting** - Configurable request throttling
2. **Password Hashing** - bcrypt with salt
3. **JWT Security** - Secure token generation and validation
4. **Input Validation** - DTO validation with class-validator
5. **SQL Injection Protection** - TypeORM parameterized queries
6. **CORS Configuration** - Cross-origin request handling

### Authentication Headers

All protected endpoints require the `Authorization` header:

```javascript
headers: {
  'Authorization': `Bearer ${sessionToken}`
}
```

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## 📚 API Documentation

### Swagger Documentation

Access comprehensive API documentation at: `http://localhost:3000/api`

The Swagger interface provides:
- Interactive API exploration
- Request/response examples
- Authentication testing
- Schema definitions

### Postman Collection

Import the generated OpenAPI specification into Postman for API testing.

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   NODE_ENV=production
   
   # Use production database
   DATABASE_HOST=your-production-db-host
   
   # Use production SMTP
   SMTP_HOST=your-production-smtp
   ```

2. **Build and Start**
   ```bash
   pnpm run build
   pnpm run start:prod
   ```

3. **Database Migration**
   ```bash
   # Ensure database schema is up to date
   # TypeORM will auto-sync in development
   # Use migrations for production
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

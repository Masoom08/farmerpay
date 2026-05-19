/**
 * Auth Module — Integration Tests
 * Tests all 9 auth endpoints using supertest with mocked database models.
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ─── Mock Sequelize models before requiring any app code ───────────

const mockUser = {
  id: 1,
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'farmer@test.com',
  mobile: '+919876543210',
  password_hash: '$2a$12$LJ3m4ys3Ky1KFSyPi5XRxeHh0B1XFpOqJ1FYXCmIvL6k8AJVjQWa', // "Test@1234"
  first_name: 'Raju',
  last_name: 'Kisan',
  is_active: true,
  is_mobile_verified: false,
  is_email_verified: false,
  failed_login_attempts: 0,
  account_locked_until: null,
  last_login: null,
  created_at: new Date(),
  userRoles: [{ role: { role_name: 'FARMER', display_name: 'Farmer' } }],
  toJSON() { return { ...this }; },
  toSafeJSON() { const v = { ...this }; delete v.password_hash; return v; },
  update: jest.fn().mockResolvedValue(true),
  increment: jest.fn().mockResolvedValue(true),
};

const mockRole = { id: 1, role_name: 'FARMER' };

const mockOtpRequest = {
  id: 1,
  otp_request_id: '660e8400-e29b-41d4-a716-446655440001',
  mobile: '+919876543210',
  otp_code: '', // Will be set dynamically
  purpose: 'register',
  attempt_count: 0,
  max_attempts: 3,
  expires_at: new Date(Date.now() + 10 * 60 * 1000),
  verified_at: null,
  update: jest.fn().mockResolvedValue(true),
  increment: jest.fn().mockResolvedValue(true),
};

const mockSession = {
  id: 1,
  user_id: 1,
  session_token: '',
  refresh_token: '',
  is_active: true,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  update: jest.fn().mockResolvedValue(true),
};

const mockResetToken = {
  id: 1,
  user_id: 1,
  token_hash: '',
  expires_at: new Date(Date.now() + 60 * 60 * 1000),
  used_at: null,
  update: jest.fn().mockResolvedValue(true),
};

// Mock the shared models module
jest.mock('../../src/shared/models', () => {
  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

  const realSequelize = require('sequelize');

  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
      authenticate: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true),
      // verify-otp performs an atomic increment via sequelize.literal(
      // 'attempt_count + 1'). The mock previously only exposed transaction/
      // authenticate/close so the literal call threw TypeError and the
      // verify-otp happy-path + invalid-OTP tests both failed.
      literal: realSequelize.literal.bind(realSequelize),
      fn: realSequelize.fn.bind(realSequelize),
      col: realSequelize.col.bind(realSequelize),
    },
    Sequelize: { Op: realSequelize.Op, DataTypes: realSequelize.DataTypes, literal: realSequelize.literal },
    User: {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue([1]),
    },
    Role: {
      findOne: jest.fn().mockResolvedValue(mockRole),
    },
    Permission: { findAll: jest.fn().mockResolvedValue([]) },
    UserRole: {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([]),
    },
    UserPermission: {
      findAll: jest.fn().mockResolvedValue([]),
    },
    RolePermission: {},
    UserSession: {
      create: jest.fn().mockResolvedValue(mockSession),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue([1]),
    },
    OtpRequest: {
      create: jest.fn().mockResolvedValue(mockOtpRequest),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      // verify-otp atomically increments attempt_count via a static
      // OtpRequest.update(..., { where: {...} }) call — the test mock
      // needs the static method, not just instance-level update().
      update: jest.fn().mockResolvedValue([1]),
    },
    PasswordResetToken: {
      create: jest.fn().mockResolvedValue(mockResetToken),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue([1]),
    },
  };
});

// Mock SMS and email services (don't send real messages)
jest.mock('../../src/shared/services/smsService', () => ({
  sendOTP: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('../../src/shared/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test' }),
}));

// Mock Redis (no Redis server needed)
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    call: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  }),
  closeRedisConnection: jest.fn(),
  setWithTTL: jest.fn(),
  getKey: jest.fn(),
  deleteKeys: jest.fn(),
  DEFAULT_TTL: 3600,
}));

// ─── Build Express app for testing ─────────────────────────────────

const config = require('../../src/config');
const requestId = require('../../src/middleware/requestId');
const language = require('../../src/middleware/language');
const errorHandler = require('../../src/middleware/errorHandler');
const authRoutes = require('../../src/modules/auth');

const app = express();
app.use(express.json());
app.use(requestId);
app.use(language);
app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(errorHandler);

// Get mocked models for test setup
const db = require('../../src/shared/models');
const bcrypt = require('bcryptjs');

// ─── Test Suites ───────────────────────────────────────────────────

describe('Auth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Register ────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should register a new user and return OTP request ID', async () => {
      db.User.findOne.mockResolvedValue(null); // No existing user
      db.User.create.mockResolvedValue({ ...mockUser, id: 1 });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/register`)
        .send({
          firstName: 'Raju',
          lastName: 'Kisan',
          mobile: '9876543210',
          email: 'farmer@test.com',
          password: 'Test@1234',
          dateOfBirth: '1990-01-15',
          gender: 'male',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();
      expect(res.body.data.otpRequestId).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(600);
    });

    it('should not disclose duplicate mobile (decoy 201 to defeat enumeration)', async () => {
      // AUTH-C3: register used to return 409 when mobile was already taken,
      // which let attackers probe for enrolled accounts. The endpoint now
      // returns a decoy 201 with a throwaway otpRequestId and no real work.
      db.User.findOne.mockResolvedValue(mockUser); // User exists

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/register`)
        .send({
          firstName: 'Raju',
          mobile: '9876543210',
          password: 'Test@1234',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.otpRequestId).toBeDefined();
    });

    // `should reject weak password` removed — register endpoint no longer
    // accepts a password field. Password-based auth was replaced by
    // MPIN + OTP (UPI pattern); see /auth/set-mpin and /auth/login.

    it('should reject invalid mobile format', async () => {
      const res = await request(app)
        .post(`${config.apiPrefix}/auth/register`)
        .send({
          firstName: 'Raju',
          mobile: '1234567890', // Doesn't start with 6-9
          password: 'Test@1234',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('mobile');
    });
  });

  // ── 2. Send OTP ────────────────────────────────────────────────

  describe('POST /auth/send-otp', () => {
    it('should send OTP for registration', async () => {
      db.OtpRequest.count.mockResolvedValue(0);

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/send-otp`)
        .send({ mobile: '9876543210', purpose: 'register' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.otpRequestId).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(600);
    });

    it('should reject if no mobile or email provided', async () => {
      const res = await request(app)
        .post(`${config.apiPrefix}/auth/send-otp`)
        .send({ purpose: 'register' });

      expect(res.status).toBe(400);
    });

    it('should reject if user not found for login purpose', async () => {
      db.User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/send-otp`)
        .send({ mobile: '9876543210', purpose: 'login' });

      expect(res.status).toBe(404);
    });
  });

  // ── 3. Verify OTP ──────────────────────────────────────────────

  describe('POST /auth/verify-otp', () => {
    it('should verify a valid OTP', async () => {
      const otpCode = '123456';
      const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');

      db.OtpRequest.findOne.mockResolvedValue({
        ...mockOtpRequest,
        otp_code: hashedOtp,
        attempt_count: 0,
        increment: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/verify-otp`)
        .send({
          otpRequestId: mockOtpRequest.otp_request_id,
          otpCode: '123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
    });

    it('should reject an invalid OTP', async () => {
      const hashedOtp = crypto.createHash('sha256').update('123456').digest('hex');

      db.OtpRequest.findOne.mockResolvedValue({
        ...mockOtpRequest,
        otp_code: hashedOtp,
        attempt_count: 0,
        increment: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/verify-otp`)
        .send({
          otpRequestId: mockOtpRequest.otp_request_id,
          otpCode: '999999',
        });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AUTH_007');
    });

    it('should reject expired OTP', async () => {
      db.OtpRequest.findOne.mockResolvedValue({
        ...mockOtpRequest,
        expires_at: new Date(Date.now() - 1000), // Expired
        increment: jest.fn(),
        update: jest.fn(),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/verify-otp`)
        .send({
          otpRequestId: mockOtpRequest.otp_request_id,
          otpCode: '123456',
        });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AUTH_008');
    });
  });

  // ── 4. Login ───────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    // Login is MPIN-based (4-digit, UPI pattern). Trivial MPINs like 1234
    // are rejected by mpinField custom validator — use 4826.
    const VALID_MPIN = '4826';
    const WRONG_MPIN = '5827';

    it('should login with valid mpin and return tokens', async () => {
      const hashedMpin = await bcrypt.hash(VALID_MPIN, 12);
      db.User.findOne.mockResolvedValue({
        ...mockUser,
        mpin_hash: hashedMpin,
        failed_login_attempts: 0,
        update: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/login`)
        .send({ mobile: '9876543210', mpin: VALID_MPIN });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.userId).toBe(mockUser.user_id);
      expect(res.body.data.user.role).toBe('FARMER');
      expect(res.body.data.expiresIn).toBe(1800);
    });

    it('should reject invalid mpin', async () => {
      const hashedMpin = await bcrypt.hash(VALID_MPIN, 12);
      db.User.findOne.mockResolvedValue({
        ...mockUser,
        mpin_hash: hashedMpin,
        failed_login_attempts: 0,
        update: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/login`)
        .send({ mobile: '9876543210', mpin: WRONG_MPIN });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_002');
    });

    it('should reject locked account', async () => {
      db.User.findOne.mockResolvedValue({
        ...mockUser,
        mpin_hash: await bcrypt.hash(VALID_MPIN, 12),
        // Lockout is now driven by failed_login_attempts hitting the
        // threshold (LOGIN_MAX_FAILURES=5). Auto-unlock was removed by
        // AUTH-H6: reset requires forgot-mpin once the counter is at max.
        failed_login_attempts: 5,
        account_locked_until: new Date(Date.now() + 15 * 60 * 1000),
        update: jest.fn(),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/login`)
        .send({ mobile: '9876543210', mpin: VALID_MPIN });

      expect(res.status).toBe(423);
      expect(res.body.errorCode).toBe('AUTH_006');
    });

    it('should reject non-existent user', async () => {
      db.User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/login`)
        .send({ mobile: '9999999999', mpin: VALID_MPIN });

      expect(res.status).toBe(401);
    });
  });

  // ── 5. Get Profile (/me) ───────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return user profile for authenticated user', async () => {
      // Generate a real token
      const token = jwt.sign(
        { id: mockUser.user_id, role: 'FARMER' },
        config.jwt.accessSecret,
        { expiresIn: '30m', issuer: config.jwt.issuer }
      );

      db.User.findOne.mockResolvedValue({
        ...mockUser,
        userRoles: [{ role: { role_name: 'FARMER', display_name: 'Farmer' } }],
      });
      db.UserRole.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get(`${config.apiPrefix}/auth/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(mockUser.user_id);
      expect(res.body.data.firstName).toBe('Raju');
      expect(res.body.data.roles).toContain('FARMER');
      expect(res.body.data.permissions).toBeDefined();
      // Ensure password is NOT returned
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app).get(`${config.apiPrefix}/auth/me`);

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_001');
    });

    it('should reject request with expired token', async () => {
      const token = jwt.sign(
        { id: mockUser.user_id, role: 'FARMER' },
        config.jwt.accessSecret,
        { expiresIn: '0s', issuer: config.jwt.issuer }
      );

      // Small delay to ensure token expires
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .get(`${config.apiPrefix}/auth/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_003');
    });
  });

  // ── 6. Refresh Token ───────────────────────────────────────────

  describe('POST /auth/refresh-token', () => {
    it('should issue a new access token with valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { id: mockUser.user_id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: '7d', issuer: config.jwt.issuer }
      );
      const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

      db.UserSession.findOne.mockResolvedValue({
        ...mockSession,
        refresh_token: hashedRefresh,
        update: jest.fn().mockResolvedValue(true),
      });
      db.User.findOne.mockResolvedValue({
        ...mockUser,
        userRoles: [{ role: { role_name: 'FARMER' } }],
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/refresh-token`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.expiresIn).toBe(1800);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post(`${config.apiPrefix}/auth/refresh-token`)
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_004');
    });
  });

  // ── 7. Logout ──────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should logout and invalidate session', async () => {
      const token = jwt.sign(
        { id: mockUser.user_id, role: 'FARMER' },
        config.jwt.accessSecret,
        { expiresIn: '30m', issuer: config.jwt.issuer }
      );

      db.UserSession.findOne.mockResolvedValue({
        ...mockSession,
        update: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post(`${config.apiPrefix}/auth/logout`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Logged out');
    });

    it('should reject logout without auth', async () => {
      const res = await request(app).post(`${config.apiPrefix}/auth/logout`);

      expect(res.status).toBe(401);
    });
  });

  // ── /auth/forgot-password and /auth/reset-password describe blocks
  //    removed: the endpoints were retired when the platform moved to
  //    MPIN+OTP auth. MPIN reset is handled via /auth/forgot-mpin which
  //    reuses /auth/send-otp + /auth/verify-otp + /auth/set-mpin and is
  //    exercised by the sendOtp / verifyOtp describe blocks above.
});

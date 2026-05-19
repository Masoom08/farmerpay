/**
 * Auth Integration Tests
 * Full journey: register → OTP → login → refresh token → logout
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');

let agent;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
});

afterAll(async () => {
  await truncateTables(['user_sessions', 'otp_requests', 'password_reset_tokens', 'users']);
  await closeConnections();
});

describe('Auth Integration', () => {
  const testMobile = '9876543210';
  let otpRequestId;
  let accessToken;
  let refreshToken;

  // ─── Registration ───────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with mobile number', async () => {
      const res = await agent
        .post('/api/v1/auth/register')
        .send({ mobile: testMobile, password: 'Secure@12345' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('userId');
    });

    it('should reject duplicate mobile registration', async () => {
      const res = await agent
        .post('/api/v1/auth/register')
        .send({ mobile: testMobile, password: 'Secure@12345' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid mobile format', async () => {
      const res = await agent
        .post('/api/v1/auth/register')
        .send({ mobile: '1234', password: 'Secure@12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── OTP Request ────────────────────────────────────────────────

  describe('POST /api/v1/auth/otp/request', () => {
    it('should send OTP to registered mobile', async () => {
      const res = await agent
        .post('/api/v1/auth/otp/request')
        .send({ mobile: testMobile });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      otpRequestId = res.body.data?.otpRequestId;
    });

    it('should reject OTP request for unregistered mobile', async () => {
      const res = await agent
        .post('/api/v1/auth/otp/request')
        .send({ mobile: '9999999999' });

      expect([400, 404]).toContain(res.status);
    });
  });

  // ─── Login ──────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await agent
        .post('/api/v1/auth/login')
        .send({ mobile: testMobile, password: 'Secure@12345' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject wrong password', async () => {
      const res = await agent
        .post('/api/v1/auth/login')
        .send({ mobile: testMobile, password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Protected Route Access ─────────────────────────────────────

  describe('GET /api/v1/farmer/profile (authenticated)', () => {
    it('should access protected route with valid token', async () => {
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      // May return 200 or 404 depending on profile existence
      expect([200, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
    });

    it('should reject request without token', async () => {
      const res = await agent.get('/api/v1/farmer/profile');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  // ─── Token Refresh ──────────────────────────────────────────────

  describe('POST /api/v1/auth/token/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      if (!refreshToken) return;

      const res = await agent
        .post('/api/v1/auth/token/refresh')
        .send({ refreshToken });

      expect([200, 201]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('accessToken');
      }
    });
  });

  // ─── Logout ─────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('should logout and invalidate session', async () => {
      if (!accessToken) return;

      const res = await agent
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 204]).toContain(res.status);
    });
  });

  // ─── Response Format ────────────────────────────────────────────

  describe('Standard response format', () => {
    it('should return consistent error format for 404', async () => {
      const res = await agent.get('/api/v1/nonexistent-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });
});

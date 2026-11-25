// Section 3.7 – OWASP Top 10 security tests (no database needed)
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'owasp-test-secret';

const app = require('../server');
const { protect } = require('../src/middlewares/authMiddleware');
const authRoutes = require('../src/routes/authRoutes');
const courseRoutes = require('../src/routes/courseRoutes');

const COURSE_ID = '650000000000000000000001';

const signToken = (payload, options = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h', ...options });

// Lists routes as "METHOD /path" and whether protect() guards them
const listRoutes = (router, prefix) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => ({
        route: `${method.toUpperCase()} ${prefix}${layer.route.path === '/' ? '' : layer.route.path}`,
        isProtected: layer.route.stack.some((s) => s.handle === protect),
      }))
    );

afterAll(async () => {
  try {
    await mongoose.connection.close();
  } catch (err) {
    // connection was never opened
  }
});

describe('A01 Broken Access Control – protected course routes', () => {
  it('SEC-T01: PUT /api/courses/:id without a token returns 401', async () => {
    const res = await request(app).put(`/api/courses/${COURSE_ID}`).send({ title: 'Hacked' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('SEC-T02: DELETE /api/courses/:id without a token returns 401', async () => {
    const res = await request(app).delete(`/api/courses/${COURSE_ID}`);
    expect(res.statusCode).toBe(401);
  });

  it('SEC-T03: a logged-in student cannot update a course (403, vertical privilege escalation)', async () => {
    const token = signToken({ id: 'student1', role: 'student' });
    const res = await request(app)
      .put(`/api/courses/${COURSE_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hacked' });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('SEC-T04: a logged-in parent cannot delete a course (403)', async () => {
    const token = signToken({ id: 'parent1', role: 'parent' });
    const res = await request(app)
      .delete(`/api/courses/${COURSE_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  it('SEC-T05: GET /api/auth/profile without a token returns 401', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.statusCode).toBe(401);
  });
});

describe('A01 Broken Access Control – route audit (static check)', () => {
  const routes = [...listRoutes(authRoutes, '/api/auth'), ...listRoutes(courseRoutes, '/api/courses')];

  it('SEC-T06: only the expected routes are guarded by the protect middleware', () => {
    const guarded = routes.filter((r) => r.isProtected).map((r) => r.route).sort();
    expect(guarded).toEqual(
      ['DELETE /api/courses/:id', 'GET /api/auth/profile', 'PUT /api/courses/:id'].sort()
    );
  });

  // Known findings: remove a route once it is protected
  it('SEC-T07: admin and write routes that are currently reachable without login (known findings)', () => {
    const sensitive = [
      'GET /api/auth/stats', // SEC-01
      'POST /api/courses', // SEC-02
      'POST /api/courses/learning-path-pdf', // SEC-03
      'POST /api/courses/assignment-pdf', // SEC-03
      'GET /api/courses/admin-assignment-stats', // SEC-04
    ];
    const unprotected = routes.filter((r) => !r.isProtected).map((r) => r.route);
    sensitive.forEach((route) => expect(unprotected).toContain(route));
  });
});

describe('A07 Identification & Authentication Failures – JWT handling', () => {
  const protectedCall = (token) =>
    request(app).put(`/api/courses/${COURSE_ID}`).set('Authorization', `Bearer ${token}`).send({});

  it('SEC-T08: a token signed with a different secret is rejected (401)', async () => {
    const forged = jwt.sign({ id: 'x', role: 'admin' }, 'attacker-secret');
    const res = await protectedCall(forged);
    expect(res.statusCode).toBe(401);
  });

  it('SEC-T09: an unsigned token (alg "none") claiming admin is rejected (401)', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ id: 'x', role: 'admin' })).toString('base64url');
    const res = await protectedCall(`${header}.${body}.`);
    expect(res.statusCode).toBe(401);
  });

  it('SEC-T10: an expired admin token is rejected (401)', async () => {
    const expired = signToken({ id: 'x', role: 'admin' }, { expiresIn: -10 });
    const res = await protectedCall(expired);
    expect(res.statusCode).toBe(401);
  });

  it('SEC-T11: a token whose payload was edited (role student -> admin) is rejected (401)', async () => {
    const [header, , signature] = signToken({ id: 'x', role: 'student' }).split('.');
    const tampered = Buffer.from(JSON.stringify({ id: 'x', role: 'admin' })).toString('base64url');
    const res = await protectedCall(`${header}.${tampered}.${signature}`);
    expect(res.statusCode).toBe(401);
  });

  it('SEC-T12: the login endpoint sends rate-limit headers (limit 60 per 15 minutes)', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.headers['ratelimit-limit']).toBe('60');
    expect(Number(res.headers['ratelimit-remaining'])).toBeLessThan(60);
  });
});

describe('A03 Injection – NoSQL operator injection and XSS', () => {
  it('SEC-T13: login rejects MongoDB operator objects instead of strings (400)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toHaveProperty('token');
  });

  it('SEC-T14: register rejects MongoDB operator objects instead of strings', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x', email: { $ne: null }, password: { $ne: null } });
    // 503 when no database is connected
    expect([400, 503]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(201);
  });

  it('SEC-T15: a script payload is not reflected back as HTML (JSON response only)', async () => {
    const payload = '<script>alert("xss")</script>';
    const res = await request(app).post('/api/auth/login').send({ email: payload, password: 'x' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<script>');
  });

  it('SEC-T16: the chat endpoint rejects a non-string message (400)', async () => {
    const res = await request(app).post('/api/chat').send({ message: { $where: 'sleep(1000)' } });
    expect(res.statusCode).toBe(400);
  });
});

describe('A05 Security Misconfiguration – HTTP security headers', () => {
  let res;

  beforeAll(async () => {
    res = await request(app).get('/');
  });

  it('SEC-T17: the X-Powered-By header is removed (no Express fingerprint)', () => {
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('SEC-T18: X-Content-Type-Options is "nosniff"', () => {
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('SEC-T19: X-Frame-Options blocks clickjacking', () => {
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('SEC-T20: a Content-Security-Policy is sent with default-src self', () => {
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
  });

  it('SEC-T21: Strict-Transport-Security (HSTS) is sent', () => {
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
  });
});

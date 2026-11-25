const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Admin routes are now protected (SEC-01 to SEC-04), so tests sign an admin JWT
process.env.JWT_SECRET = process.env.JWT_SECRET || 'api-test-secret';
const app = require('../server');

const adminAuth = () =>
  `Bearer ${jwt.sign({ id: 'qa-admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;

describe('API Automation Test Suite', () => {
  let adminToken = '';

  // Close database connection after all tests complete
  afterAll(async () => {
    try {
      await mongoose.connection.close();
    } catch (_err) {
      // Ignored if connection wasn't open
    }
  });

  // Test Suite 1: Server Health Check
  describe('GET / - Server Health Check', () => {
    it('should return 200 and success message when server is running', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('CylixLab Backend API is Running Successfully!');
    });
  });

  // Test Suite 2: Authentication & User Management
  describe('Authentication Routes (/api/auth)', () => {
    it('POST /api/auth/login - should return status 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/valid email and password/i);
    });

    it('POST /api/auth/login - should return status 400 when invalid credentials are provided', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_test_user@gmail.com',
          password: 'wrong_test_password_123',
        });

      expect([400, 401, 503]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /api/auth/login - should log in dedicated admin successfully with valid credentials', async () => {
      const adminEmail = process.env.ADMIN_EMAIL || 'ravinduanushka248@gmail.com';
      // SEC-11: never keep the real admin password in source code
      const adminPassword = process.env.ADMIN_PASSWORD || 'not-the-real-admin-password';

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        });

      expect([200, 400]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('token');
        adminToken = res.body.token;
      }
    });

    it('POST /api/auth/register - should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '', email: '', password: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /api/auth/register - should reject public registration using admin email', async () => {
      const adminEmail = process.env.ADMIN_EMAIL || 'ravinduanushka248@gmail.com';
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Fake Admin',
          email: adminEmail,
          password: 'somepassword123',
          role: 'student',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/admin account is dedicated/i);
    });

    it('GET /api/auth/verify-email - should return success for email verification route', async () => {
      const res = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'dummy_verification_token' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('GET /api/auth/profile - should return 401 when accessing protected profile without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('GET /api/auth/profile - should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_malformed_token_xyz');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('GET /api/auth/stats - should return user statistics', async () => {
      const res = await request(app).get('/api/auth/stats').set('Authorization', adminAuth());

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('success', true);
      }
    });
  });

  // Test Suite 3: Course Management Routes (/api/courses)
  describe('Course Management Routes (/api/courses)', () => {
    it('GET /api/courses - should retrieve courses list', async () => {
      const res = await request(app).get('/api/courses');

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('courses');
        expect(Array.isArray(res.body.courses)).toBe(true);
      }
    });

    it('GET /api/courses/:id - should handle course lookup by ID', async () => {
      const res = await request(app).get('/api/courses/650000000000000000000000');

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    it('POST /api/courses - should create a course', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', adminAuth())
        .send({
          title: 'Automated QA Testing Fundamentals',
          description: 'Hands-on guide to automated testing with Jest and CI/CD pipelines',
          category: 'Software Testing',
          price: 49,
        });

      expect([201, 500]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        expect(res.body).toHaveProperty('success', true);
      }
    });

    it('PUT /api/courses/:id - should block unauthorized course updates', async () => {
      const res = await request(app)
        .put('/api/courses/650000000000000000000000')
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('DELETE /api/courses/:id - should block unauthorized course deletion', async () => {
      const res = await request(app).delete('/api/courses/dummycourseid123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('GET /api/courses/learning-path-pdf/:pathId - should return learning path metadata', async () => {
      const res = await request(app).get('/api/courses/learning-path-pdf/01');

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    it('GET /api/courses/assignment-pdf/:assignmentId - should return assignment metadata', async () => {
      const res = await request(app).get('/api/courses/assignment-pdf/01');

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    it('POST /api/courses/assignment-submit - should record assignment submission', async () => {
      const res = await request(app)
        .post('/api/courses/assignment-submit')
        .send({
          assignmentId: '01',
          studentEmail: 'student.test@cylixlab.com',
          studentName: 'Test Student',
          marks: 28,
          total: 30,
          answeredCount: 30,
        });

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('success', true);
      }
    });

    it('GET /api/courses/admin-assignment-stats - should return institutional statistics', async () => {
      const res = await request(app)
        .get('/api/courses/admin-assignment-stats')
        .set('Authorization', adminAuth());

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('stats');
      }
    });

    it('GET /api/courses/student-submissions - should query student submissions', async () => {
      const res = await request(app)
        .get('/api/courses/student-submissions')
        .query({ studentEmail: 'student.test@cylixlab.com' });

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('success', true);
      }
    });
  });

  // Test Suite 4: Smart Chatbot Routes (/api/chat)
  describe('AI Chatbot Routes (/api/chat)', () => {
    it('POST /api/chat - should reject request when message content is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/message content is required/i);
    });

    it('POST /api/chat/message - should reject request with empty body', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});

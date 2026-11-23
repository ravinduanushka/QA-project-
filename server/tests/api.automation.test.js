const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('API Automation Test Suite', () => {
  // Close database connection after all tests complete
  afterAll(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      // Ignored if connection wasn't open
    }
  });

  // Test Case 1: Server Health Check
  describe('GET / - Server Health Check', () => {
    it('should return 200 and success message when server is running', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('CylixLab Backend API is Running Successfully!');
    });
  });

  // Test Case 2: Get Courses List
  describe('GET /api/courses - Retrieve Courses List', () => {
    it('should return status 200 and list of courses', async () => {
      const res = await request(app).get('/api/courses');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('courses');
      expect(Array.isArray(res.body.courses)).toBe(true);
    });
  });

  // Test Case 3: Invalid Login Validation
  describe('POST /api/auth/login - Invalid Login Validation', () => {
    it('should return status 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: '',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/valid email and password/i);
    });

    it('should return status 400 when invalid credentials are provided', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_test_user@gmail.com',
          password: 'wrong_test_password_123',
        });

      expect([400, 401]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('message');
    });
  });

  // Test Case 4: Unauthorized Access Check (No Token)
  describe('GET /api/auth/profile - Unauthorized Access Validation', () => {
    it('should return status 401 when accessing protected route without a token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should return status 401 when accessing protected route with an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token_xyz_123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });

  // Test Case 5: Unauthorized Course Deletion (Protected Role Check)
  describe('DELETE /api/courses/:id - Protected Course Route Check', () => {
    it('should return status 401 when attempting to delete course without authorization', async () => {
      const res = await request(app).delete('/api/courses/dummycourseid123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });
});

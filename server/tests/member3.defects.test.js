const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

// Regression test for DEF-03 (GitHub issue #9) – BVA-P1 / BVA-P2
describe('DEF-03 regression: password length on register', () => {
  afterAll(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      // ignore if the connection was not opened
    }
  });

  it('rejects a 5-character password with 400 (BVA-P1)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Regression Test',
      email: `def03-short-${Date.now()}@test.com`,
      password: 'abcd1',
      role: 'student',
      age: 20,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/at least 6 characters/i);
  });

  it('accepts a 6-character password with 201 (BVA-P2)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Regression Test',
      email: `def03-ok-${Date.now()}@test.com`,
      password: 'abcd12',
      role: 'student',
      age: 20,
    });

    expect(res.statusCode).toBe(201);
  });
});
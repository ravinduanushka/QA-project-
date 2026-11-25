const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

// Regression tests for DEF-01 (#7), DEF-02 (#8) and DEF-04 (#10).
// Inputs are the same ones Member 3 used to log the defects (Section 3.3).
const uniqueEmail = (tag) => `def-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;

const register = (overrides) =>
  request(app)
    .post('/api/auth/register')
    .send({
      name: 'Regression Test',
      password: 'abc123',
      role: 'student',
      age: 20,
      ...overrides,
    });

describe('DEF-01 / DEF-02 regression: email format on register', () => {
  it('DEF-01 (EP-E2): rejects an email without "@" with 400', async () => {
    const res = await register({ email: 'eptst.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });

  it('DEF-02: rejects an email without a domain (usr@.com) with 400', async () => {
    const res = await register({ email: 'usr@.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });

  it('accepts a valid email with 201', async () => {
    const res = await register({ email: uniqueEmail('email-ok') });
    expect(res.statusCode).toBe(201);
  });
});

describe('DEF-04 regression: student age boundaries on register (BVA)', () => {
  it.each([
    [3, 400], // BVA-A1
    [4, 201],
    [120, 201],
    [121, 400], // BVA-A6
  ])('age %i returns %i', async (age, expected) => {
    const res = await register({ email: uniqueEmail(`age-${age}`), age });
    expect(res.statusCode).toBe(expected);
    if (expected === 400) {
      expect(res.body.message).toMatch(/between 4 and 120/i);
    }
  });

  it('rejects a non-numeric age with 400', async () => {
    const res = await register({ email: uniqueEmail('age-abc'), age: 'abc' });
    expect(res.statusCode).toBe(400);
  });

  it('does not require an age for a parent account', async () => {
    const res = await register({
      email: uniqueEmail('parent'),
      role: 'parent',
      age: undefined,
      studentName: 'Child Name',
    });
    expect(res.statusCode).toBe(201);
  });
});

afterAll(async () => {
  try {
    await mongoose.connection.close();
  } catch (err) {
    // ignore if the connection was not opened
  }
});

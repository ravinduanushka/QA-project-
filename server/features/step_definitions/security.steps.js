// Steps for security_access_control.feature (same chain as PUT /api/courses/:id)
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../src/middlewares/authMiddleware');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'bdd-test-secret';

const sign = (role, options = { expiresIn: '1h' }) =>
  jwt.sign({ id: `${role}-1`, role }, process.env.JWT_SECRET, options);

const tokens = {
  missing: () => null,
  forged: () => jwt.sign({ id: 'x', role: 'admin' }, 'attacker-secret'),
  expired: () => sign('admin', { expiresIn: -10 }),
  student: () => sign('student'),
  parent: () => sign('parent'),
  admin: () => sign('admin'),
};

const mockResponse = () => {
  const res = { statusCode: 200 };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

Given('a visitor sends a course update request with a {string} token', function (type) {
  const token = tokens[type]();
  this.req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
});

Given('a student edits their token payload to claim the {string} role', function (role) {
  const [header, , signature] = sign('student').split('.');
  const payload = Buffer.from(JSON.stringify({ id: 'student-1', role })).toString('base64url');
  this.req = { headers: { authorization: `Bearer ${header}.${payload}.${signature}` } };
});

When('the access control middleware checks the request', async function () {
  this.res = mockResponse();
  this.handlerReached = false;

  let passedProtect = false;
  await protect(this.req, this.res, () => {
    passedProtect = true;
  });

  if (passedProtect) {
    authorize('instructor', 'admin')(this.req, this.res, () => {
      this.handlerReached = true;
    });
  }
});

Then('the request is answered with status {int}', function (status) {
  assert.strictEqual(this.res.statusCode, status);
});

Then('the course update handler is {string}', function (expected) {
  assert.strictEqual(this.handlerReached, expected === 'reached');
});

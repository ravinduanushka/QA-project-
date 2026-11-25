const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../src/middlewares/authMiddleware');

// Section 3.4 – White-Box Testing of protect() and authorize()
// Goal: 100% statement and branch coverage of authMiddleware.js

const TEST_SECRET = 'whitebox-test-secret';
const originalSecret = process.env.JWT_SECRET;

// Fake Express response object that records status() and json() calls
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});

describe('White-box: protect() – V(G) = 4', () => {
  it('WB-01 (Path P1): no Authorization header -> 401', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('WB-02 (Path P1): header does not start with "Bearer" -> 401', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('WB-03 (Path P2): "Bearer" with no token -> 401', async () => {
    const req = { headers: { authorization: 'Bearer' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('WB-04 (Path P3): invalid token -> jwt.verify throws -> 401', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.value' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('WB-05 (Path P4): valid token -> req.user is set and next() is called', async () => {
    const token = jwt.sign({ id: 'user-1', role: 'student' }, TEST_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe('student');
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('White-box: authorize() – V(G) = 2', () => {
  it('WB-06: allowed role (admin) -> next() is called', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('instructor', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('WB-07: role not allowed (student) -> 403', () => {
    const req = { user: { role: 'student' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('instructor', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
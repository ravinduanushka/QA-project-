const { validateEmail, validatePassword, validateAge } = require('../src/utils/validators');

// Section 3.5 – TDD: these tests were written BEFORE validators.js existed.
// Test values come from the Member 3 EP/BVA test cases (Section 3.3).

describe('TDD: validatePassword()', () => {
  it('TDD-P1: rejects an empty password', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('TDD-P2: rejects a 5-character password (BVA-P1)', () => {
    expect(validatePassword('abcd1').valid).toBe(false);
  });

  it('TDD-P3: accepts a 6-character password (BVA-P2)', () => {
    expect(validatePassword('abcd12').valid).toBe(true);
  });

  it('TDD-P4: rejects a non-string password', () => {
    expect(validatePassword(12345).valid).toBe(false);
  });
});

describe('TDD: validateEmail()', () => {
  it('TDD-E1: accepts a valid email (EP-E1)', () => {
    expect(validateEmail('student@test.com').valid).toBe(true);
  });

  it('TDD-E2: rejects an email without "@" (EP-E2 / DEF-01)', () => {
    expect(validateEmail('eptst.com').valid).toBe(false);
  });

  it('TDD-E3: rejects an email without a domain (EP-E3 / DEF-02)', () => {
    expect(validateEmail('usr@.com').valid).toBe(false);
  });

  it('TDD-E4: rejects an empty email (EP-E4)', () => {
    expect(validateEmail('').valid).toBe(false);
  });
});

describe('TDD: validateAge()', () => {
  it('TDD-A1: rejects age 3 (BVA-A1 / DEF-04)', () => {
    expect(validateAge(3).valid).toBe(false);
  });

  it('TDD-A2: accepts age 4 (BVA-A2)', () => {
    expect(validateAge(4).valid).toBe(true);
  });

  it('TDD-A3: accepts age 120 (BVA-A5)', () => {
    expect(validateAge(120).valid).toBe(true);
  });

  it('TDD-A4: rejects age 121 (BVA-A6 / DEF-04)', () => {
    expect(validateAge(121).valid).toBe(false);
  });

  it('TDD-A5: rejects a non-number age', () => {
    expect(validateAge('abc').valid).toBe(false);
  });
});
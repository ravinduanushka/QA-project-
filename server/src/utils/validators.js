// Registration input validators – built with TDD (Section 3.5)
const MIN_PASSWORD_LENGTH = 6;
const MIN_AGE = 4;
const MAX_AGE = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// Refactor: one helper for the repeated result objects
const ok = () => ({ valid: true });
const fail = (message) => ({ valid: false, message });

const validatePassword = (password) =>
  typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
    ? ok()
    : fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

const validateEmail = (email) =>
  typeof email === 'string' && EMAIL_PATTERN.test(email)
    ? ok()
    : fail('Please enter a valid email address.');

const validateAge = (age) =>
  Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE
    ? ok()
    : fail(`Age must be between ${MIN_AGE} and ${MAX_AGE}.`);

module.exports = { validateEmail, validatePassword, validateAge };
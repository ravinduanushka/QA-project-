const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { validatePassword, validateAge } = require('../../src/utils/validators');

Given('a student enters the password {string}', function (password) {
  this.password = password;
});

Given('a student enters the age {int}', function (age) {
  this.age = age;
});

When('the registration details are validated', function () {
  if (this.password !== undefined) {
    this.passwordResult = validatePassword(this.password);
  }
  if (this.age !== undefined) {
    this.ageResult = validateAge(this.age);
  }
});

Then('the password should be {string}', function (expected) {
  assert.strictEqual(this.passwordResult.valid, expected === 'accepted');
});

Then('the age should be {string}', function (expected) {
  assert.strictEqual(this.ageResult.valid, expected === 'accepted');
});
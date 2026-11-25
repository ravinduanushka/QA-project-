Feature: Student registration input validation
  As a CylixLab student
  I want my registration details to be checked
  So that only accounts with valid details are created

  Scenario Outline: Password must have at least 6 characters
    Given a student enters the password "<password>"
    When the registration details are validated
    Then the password should be "<result>"

    Examples:
      | password | result   |
      | abcd1    | rejected |
      | abcd12   | accepted |
      | abcd123  | accepted |

  Scenario Outline: Student age must be between 4 and 120
    Given a student enters the age <age>
    When the registration details are validated
    Then the age should be "<result>"

    Examples:
      | age | result   |
      | 3   | rejected |
      | 4   | accepted |
      | 120 | accepted |
      | 121 | rejected |
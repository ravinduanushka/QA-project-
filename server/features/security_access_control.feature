Feature: Role-based access control on course management
  As the CylixLab administrator
  I want only authorised admins to change or delete courses
  So that students, parents and attackers cannot tamper with the curriculum

  Scenario Outline: Access to a protected course route depends on the token
    Given a visitor sends a course update request with a "<token>" token
    When the access control middleware checks the request
    Then the request is answered with status <status>
    And the course update handler is "<handler>"

    Examples:
      | token          | status | handler     |
      | missing        | 401    | not reached |
      | forged         | 401    | not reached |
      | expired        | 401    | not reached |
      | student        | 403    | not reached |
      | parent         | 403    | not reached |
      | admin          | 200    | reached     |

  Scenario: A student cannot raise their own role by editing the token
    Given a student edits their token payload to claim the "admin" role
    When the access control middleware checks the request
    Then the request is answered with status 401
    And the course update handler is "not reached"

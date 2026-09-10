# ADR-006: People Engine & Employment Architecture

* **Status:** Accepted  
* **Date:** 2026-09-10  
* **Deciders:** DeVoc Engineering Team  
* **Subsystem:** People Domain & Employment Architecture  

---

## Context and Problem Statement

DeVoc OS requires a robust representation of people within tenant organizations. A single system user may have multiple roles (e.g., Founder, Mentor, Tech Lead) simultaneously, and people may or may not have authenticated login accounts (`User`).

Key requirements:
- Decouple physical human identity (`Person`) from login credentials (`User`).
- Configurable roles (`Role`) and contextual assignments (`PersonRole`).
- Employment lifecycle state management (`Employment` & `EmploymentHistory`).
- Reporting hierarchies (`manager_id` / direct reports).
- Skill taxonomy and proficiency tracking.

---

## Decision Outcome

**Chosen Option:** **Decoupled Person Identity with Contextual Roles and Employment State Machine**

### Rationale

1. **Person vs User Decoupling**: A `Person` entity represents the human. An optional `user_id` foreign key links a Person to their login account (`users`). This allows representing people who do not log into the system (e.g. external freelancers or offline students) without forcing user account creation.
2. **Contextual Role Assignments**: `person_roles` links `person_id` to `role_id` with optional `business_unit_id`, `department_id`, and `team_id`. This allows a person to hold different roles across different organizational areas.
3. **Employment Lifecycle State Machine**: Employment status enforces explicit valid transitions:
   - `probation` → `active`, `terminated`, `resigned`
   - `active` → `suspended`, `terminated`, `resigned`
   - `suspended` → `active`, `terminated`, `resigned`
   - `terminated` / `resigned` (terminal states)
   Every transition records an immutable log in `employment_history`.

---

## Consequences

### Positive
- Flexible representation for employees, founders, mentors, trainers, freelancers, and students.
- Preserves tenant isolation across all people records.
- Immutable employment history audit log.

### Negative / Trade-offs
- Queries joining Person, User, Roles, and Employment require clear index coverage.

# Milestone 2 — People Engine & Employment Architecture

**Status:** Ready for implementation  
**Milestone:** M2  
**Scope:** Person → Configurable Roles → Contextual Role Assignments → Employment & History → Reporting → Skills Taxonomy  
**Primary goal:** Establish the People Engine for DeVoc OS, representing real physical humans, configurable roles, contextual role assignments, employment contracts, lifecycle history, reporting hierarchies, skills, and tenant-isolated APIs.

---

## 1. Purpose

Milestone 2 creates the **People Engine** of DeVoc OS. It establishes:

1. Physical human representation (`Person`) decoupled from authenticated login identity (`User`).
2. Configurable organizational roles (`Role`) (e.g. Founder, Employee, Student, Trainer, Mentor, Reviewer, Freelancer).
3. Contextual role assignments (`PersonRole`) linking people to roles with optional organizational context (`business_unit_id`, `department_id`, `team_id`).
4. Employment contracts (`Employment`) with lifecycle state machine handling (`probation`, `active`, `suspended`, `terminated`, `resigned`).
5. Append-only employment history (`EmploymentHistory`).
6. Reporting manager relationships (`manager_id` / direct reports).
7. Skills taxonomy (`Skill`) and person skill proficiency tracking (`PersonSkill`).
8. REST API endpoints under `/api/v1/`.
9. Multi-tenant isolation, authorization guards, domain event publishing, and automated test coverage.

---

## 2. Architectural Constraints

- Multi-tenant architecture is mandatory: every record contains `organization_id`.
- Decoupled model: `Person` is separate from `User` (authenticated identity).
- UUID primary keys and UTC timestamps across all tables.
- REST API under `/api/v1/`.
- Repositories strictly scope queries by `WHERE organization_id = $tenant_id AND id = $resource_id`.
- Cross-tenant requests for unassigned resource UUIDs return `404 NOT_FOUND`.

---

## 3. Non-Goals

Do NOT implement in M2:
- Generic Assignment Engine (connecting people to work/projects/tasks).
- Work Engine / Work Logs.
- Evaluation Engine / Reviews.
- Payroll processing or salary calculations.
- Recruitment / ATS system.
- LMS / Course content management.
- Advanced analytics dashboards.

---

## 4. Database Schema Specification

### Tables
1. `people`: `id`, `organization_id`, `user_id` (NULL FK), `first_name`, `last_name`, `email`, `phone`, `status` (`active`, `inactive`, `archived`), `created_at`, `updated_at`.
2. `roles`: `id`, `organization_id`, `name`, `code`, `description`, `is_system`, `status` (`active`, `inactive`), `created_at`, `updated_at`.
3. `person_roles`: `id`, `organization_id`, `person_id`, `role_id`, `business_unit_id`, `department_id`, `team_id`, `status` (`active`, `inactive`, `ended`), `start_date`, `end_date`, `created_at`, `updated_at`.
4. `employments`: `id`, `organization_id`, `person_id`, `employment_type` (`full_time`, `part_time`, `contract`, `internship`, `freelance`), `status` (`probation`, `active`, `suspended`, `terminated`, `resigned`), `job_title`, `department_id`, `business_unit_id`, `branch_id`, `manager_id`, `start_date`, `end_date`, `created_at`, `updated_at`.
5. `employment_history`: `id`, `organization_id`, `employment_id`, `person_id`, `previous_status`, `new_status`, `change_reason`, `effective_date`, `created_at`.
6. `skills`: `id`, `organization_id`, `name`, `code`, `category`, `status` (`active`, `inactive`), `created_at`, `updated_at`.
7. `person_skills`: `id`, `organization_id`, `person_id`, `skill_id`, `proficiency_level` (`beginner`, `intermediate`, `advanced`, `expert`), `created_at`, `updated_at`.

import { describe, it, expect } from 'vitest';
import { ROLE_NAVIGATION_REGISTRY, UNIFIED_NAV_SECTIONS } from '../navigation/navigation.registry';

describe('Navigation Registry & Role Definitions', () => {
  it('defines unified workspace navigation with core engine destinations', () => {
    const coreSection = UNIFIED_NAV_SECTIONS.find((s) => s.id === 'core');
    expect(coreSection).toBeDefined();

    const labels = coreSection?.items.map((i) => i.label);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Work & Tasks');
    expect(labels).toContain('Learning');
    expect(labels).toContain('Workforce & Time');
    expect(labels).toContain('Analytics');
  });

  it('defines all required F1.2 role navigation configurations', () => {
    const roles = [
      'student',
      'mentor',
      'reviewer',
      'employee',
      'developer',
      'founder',
      'academy_head',
      'project_manager',
      'admin',
    ] as const;

    for (const role of roles) {
      const config = ROLE_NAVIGATION_REGISTRY[role];
      expect(config).toBeDefined();
      expect(config.role).toBe(role);
      expect(config.sections.length).toBeGreaterThan(0);
      expect(config.sections[0].items.length).toBeGreaterThan(0);
    }
  });

  it('includes Student-specific navigation items according to approved design', () => {
    const studentItems = ROLE_NAVIGATION_REGISTRY.student.sections[0].items.map((i) => i.label);

    expect(studentItems).toContain('Home');
    expect(studentItems).toContain('My Learning');
    expect(studentItems).toContain('My Roadmap');
    expect(studentItems).toContain('Activities');
    expect(studentItems).toContain('Assessments');
    expect(studentItems).toContain('My Mentor');
    expect(studentItems).toContain('Reviews');
  });

  it('includes Founder-specific cross-BU navigation items according to approved design', () => {
    const founderItems = ROLE_NAVIGATION_REGISTRY.founder.sections[0].items.map((i) => i.label);

    expect(founderItems).toContain('Dashboard');
    expect(founderItems).toContain('Organization');
    expect(founderItems).toContain('People');
    expect(founderItems).toContain('Academy');
    expect(founderItems).toContain('Projects');
    expect(founderItems).toContain('Work');
    expect(founderItems).toContain('Learning');
    expect(founderItems).toContain('Finance');
    expect(founderItems).toContain('Analytics');
  });
});

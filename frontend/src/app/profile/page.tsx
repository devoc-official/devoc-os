'use client';

import React from 'react';
import { User, Shield, Building2, Layers, GraduationCap, UserCheck } from 'lucide-react';
import { useAuth } from '../../auth/use-auth';
import { useRole } from '../../roles/role.context';
import { useEnrollment } from '../../features/student/hooks/use-enrollment';
import { useMentor } from '../../features/student/hooks/use-mentor';
import { AppShell } from '../../layouts/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';

export default function ProfilePage() {
  const { user, person, currentOrganization } = useAuth();
  const { activeRoles, currentRole } = useRole();
  const { activeEnrollment, activeProgram } = useEnrollment();
  const { mentorPerson } = useMentor(activeEnrollment?.id);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            User Identity & Profile
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Backend identity, associated Person record, active roles, and organizational context.
          </p>
        </div>

        {/* Identity Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.fullName || 'User'} size="lg" />
              <div>
                <CardTitle className="text-base">{user?.fullName || 'Authorized Member'}</CardTitle>
                <CardDescription className="font-mono text-xs">{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-devoc-border/60 pt-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                  User Account
                </span>
                <span className="font-medium text-devoc-text-primary">{user?.fullName || 'User'}</span>
                <span className="font-mono text-[11px] text-devoc-text-secondary block">{user?.email}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                  Current Tenant
                </span>
                <span className="font-medium text-devoc-text-primary">{currentOrganization?.organizationName || 'DeVoc Primary'}</span>
                <span className="text-[11px] text-devoc-text-secondary block capitalize">{currentOrganization?.role || 'org_member'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academy Learning & Mentorship Context Card (when enrolled) */}
        {activeEnrollment && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-devoc-brand" />
                <CardTitle className="text-sm">Academy Enrollment & Mentorship</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Authoritative M7 Learning Engine enrollment and mentorship pairing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-devoc-border/60 pt-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                    Enrolled Program
                  </span>
                  <span className="font-semibold text-devoc-text-primary block mt-0.5">
                    {activeProgram?.name || 'Full-Stack Software Engineering'}
                  </span>
                  <Badge variant="brand" size="sm" className="mt-1 capitalize">
                    {activeEnrollment.status}
                  </Badge>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                    Assigned Mentor
                  </span>
                  <span className="font-semibold text-devoc-text-primary block mt-0.5">
                    {mentorPerson ? `${mentorPerson.firstName} ${mentorPerson.lastName}` : 'Academy Lead'}
                  </span>
                  <span className="text-[11px] font-mono text-devoc-text-secondary block">
                    {mentorPerson?.email || 'mentor@devoc.internal'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                    Enrolled Date
                  </span>
                  <span className="font-mono text-devoc-text-primary block mt-0.5">
                    {new Date(activeEnrollment.enrolledAt).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] text-devoc-text-secondary block">
                    Self-paced curriculum
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roles and Assignments Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-devoc-brand" />
              <CardTitle className="text-sm">Assigned Roles & Capabilities</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Roles assigned to this Person in the backend People Engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="divide-y divide-devoc-border/60">
              {activeRoles.map((role) => (
                <div key={role.category} className="py-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-devoc-text-primary">{role.name}</span>
                      <span className="font-mono text-[10px] text-devoc-text-tertiary">({role.code})</span>
                      {role.isPrimary && (
                        <Badge variant="brand" size="sm">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-devoc-text-secondary mt-0.5">{role.description}</p>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

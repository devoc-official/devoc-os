'use client';

import React, { useState } from 'react';
import { Users, ShieldCheck, Link as LinkIcon, Unlink, Plus, AlertTriangle } from 'lucide-react';
import { useAdminPeople } from '../hooks/use-admin-people';
import { Person } from '../../../api/people.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';

export function AdminPeopleView() {
  const {
    people,
    employments,
    employmentMap,
    roles,
    businessUnits,
    buMap,
    departments,
    deptMap,
    teams,
    teamMap,
    members,
    isLoading,
    assignRole,
    isAssigningRole,
    endRole,
    linkUser,
    unlinkUser,
  } = useAdminPeople();

  // Role Assignment Modal State
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [targetRoleId, setTargetRoleId] = useState('');
  const [targetBuId, setTargetBuId] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Unlink Confirmation State
  const [isUnlinkOpen, setIsUnlinkOpen] = useState(false);

  // Link User Modal State
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Available users not yet linked to any person
  const unlinkedUsers = members.filter(
    (m) => !people.some((p) => p.userId === m.userId)
  );

  const openAssignRole = (p: Person) => {
    setSelectedPerson(p);
    setTargetRoleId(roles[0]?.id || '');
    setTargetBuId('');
    setTargetDeptId('');
    setTargetTeamId('');
    setErrorMsg('');
    setIsAssignRoleOpen(true);
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !targetRoleId) return;
    setErrorMsg('');
    try {
      await assignRole({
        personId: selectedPerson.id,
        roleId: targetRoleId,
        businessUnitId: targetBuId || null,
        departmentId: targetDeptId || null,
        teamId: targetTeamId || null,
      });
      setIsAssignRoleOpen(false);
      setSelectedPerson(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign contextual role');
    }
  };

  const handleUnlinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    setErrorMsg('');
    try {
      await unlinkUser(selectedPerson.id);
      setIsUnlinkOpen(false);
      setSelectedPerson(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unlink user account');
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedUserId) return;
    setErrorMsg('');
    try {
      await linkUser({ personId: selectedPerson.id, userId: selectedUserId });
      setIsLinkOpen(false);
      setSelectedPerson(null);
      setSelectedUserId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link user account');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-devoc-surface-muted animate-pulse rounded" />
        <div className="h-64 bg-devoc-surface-muted animate-pulse rounded border border-devoc-border" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            People & Operational Identities
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Personnel records, operational employments, contextual role assignments, and login bindings
          </p>
        </div>
      </div>

      {/* People Table */}
      <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
            <tr>
              <th className="py-2.5 px-3">Person</th>
              <th className="py-2.5 px-3">Primary Employment</th>
              <th className="py-2.5 px-3">Linked User Account</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
            {people.map((p) => {
              const emp = employmentMap.get(p.id);
              const isLinked = Boolean(p.userId);

              return (
                <tr key={p.id} className="hover:bg-devoc-surface-hover transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-devoc-text-primary">
                      {p.firstName} {p.lastName}
                    </div>
                    <div className="text-[11px] font-mono text-devoc-text-muted">{p.email}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    {emp ? (
                      <div>
                        <div className="font-medium text-devoc-text-primary">{emp.jobTitle || 'Staff'}</div>
                        <div className="text-[10px] text-devoc-text-muted font-mono uppercase">
                          {emp.employmentType}
                        </div>
                      </div>
                    ) : (
                      <span className="text-devoc-text-muted italic">No active employment</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {isLinked ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-devoc-text-primary">
                        <LinkIcon className="h-3 w-3 text-green-400" />
                        <span>{p.userId}</span>
                        <button
                          onClick={() => {
                            setSelectedPerson(p);
                            setErrorMsg('');
                            setIsUnlinkOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 ml-1 p-0.5"
                          title="Unlink user account"
                        >
                          <Unlink className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPerson(p);
                          setSelectedUserId(unlinkedUsers[0]?.userId || '');
                          setErrorMsg('');
                          setIsLinkOpen(true);
                        }}
                        className="text-amber-500 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Plus className="h-3 w-3" />
                        Link User Account
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={p.status || 'active'} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => openAssignRole(p)}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Assign Role
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assign Contextual Role Dialog */}
      <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Contextual Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignRoleSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="text-xs text-devoc-text-muted">
              Assigning role for:{' '}
              <strong className="text-devoc-text-primary">
                {selectedPerson?.firstName} {selectedPerson?.lastName}
              </strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Select Role</label>
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
                required
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">
                Scope Business Unit (Optional)
              </label>
              <select
                value={targetBuId}
                onChange={(e) => setTargetBuId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None (Organization-wide)</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">
                Scope Department (Optional)
              </label>
              <select
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Scope Team (Optional)</label>
              <select
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignRoleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isAssigningRole}>
                {isAssigningRole ? 'Assigning...' : 'Assign Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unlink User Account Dialog */}
      <Dialog open={isUnlinkOpen} onOpenChange={setIsUnlinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Unlink User Login Account
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnlinkSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="text-xs text-devoc-text-muted">
              Are you sure you want to decouple login user account{' '}
              <strong className="text-devoc-text-primary">{selectedPerson?.userId}</strong> from operational person{' '}
              <strong className="text-devoc-text-primary">
                {selectedPerson?.firstName} {selectedPerson?.lastName}
              </strong>
              ?
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsUnlinkOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm">
                Confirm Unlink
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link User Account Dialog */}
      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link User Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="text-xs text-devoc-text-muted">
              Linking person profile:{' '}
              <strong className="text-devoc-text-primary">
                {selectedPerson?.firstName} {selectedPerson?.lastName}
              </strong>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Select Member Account</label>
              {unlinkedUsers.length > 0 ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
                  required
                >
                  {unlinkedUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.fullName || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 text-xs text-devoc-text-muted rounded border border-dashed border-devoc-border bg-devoc-surface-muted">
                  No unlinked member accounts available. Invite new members in Users & Access first.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLinkOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={unlinkedUsers.length === 0}>
                Confirm Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

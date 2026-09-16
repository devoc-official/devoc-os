'use client';

import React, { useState } from 'react';
import { Users, UserPlus, ShieldAlert, Key, Link as LinkIcon, Unlink, Check, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { useAdminUsers } from '../hooks/use-admin-users';
import { OrganizationMember } from '../../../api/admin.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';

export function AdminUsersView() {
  const {
    members,
    people,
    isLoading,
    inviteMember,
    isInviting,
    updateMemberRole,
    updateMemberStatus,
    linkUser,
    unlinkUser,
  } = useAdminUsers();

  // Dialog States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'org_admin' | 'org_member'>('org_member');

  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<'org_admin' | 'org_member'>('org_member');

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended'>('active');

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Handle Invite
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setErrorMsg('');
    try {
      await inviteMember({ email: inviteEmail.trim(), role: inviteRole });
      setIsInviteOpen(false);
      setInviteEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to invite member');
    }
  };

  // Handle Role Change
  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setErrorMsg('');
    try {
      await updateMemberRole({ userId: selectedMember.userId, role: targetRole });
      setIsRoleModalOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update member role');
    }
  };

  // Handle Status Change (Activate / Suspend)
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setErrorMsg('');
    try {
      await updateMemberStatus({ userId: selectedMember.userId, status: targetStatus });
      setIsStatusModalOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update member status');
    }
  };

  // Handle Link User
  const handleLinkUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !selectedPersonId) return;
    setErrorMsg('');
    try {
      await linkUser({ personId: selectedPersonId, userId: selectedMember.userId });
      setIsLinkModalOpen(false);
      setSelectedMember(null);
      setSelectedPersonId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link user to person');
    }
  };

  // Unlinked people available for linking
  const availablePeople = people.filter((p) => !p.userId);

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
            Users & Access Administration
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Manage organization members, security access roles, and identity-to-person bindings
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setErrorMsg('');
            setIsInviteOpen(true);
          }}
          className="gap-1.5 text-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite User
        </Button>
      </div>

      {/* Members Directory Table */}
      <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
            <tr>
              <th className="py-2.5 px-3">User</th>
              <th className="py-2.5 px-3">Membership Role</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Linked Operational Person</th>
              <th className="py-2.5 px-3">Joined / Invited</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
            {members.map((member) => {
              const isUnlinked = !member.linkedPerson;
              return (
                <tr key={member.userId} className="hover:bg-devoc-surface-hover transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-devoc-text-primary">{member.fullName || '—'}</div>
                    <div className="text-[11px] font-mono text-devoc-text-muted">{member.email}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                        member.role === 'org_admin'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-devoc-surface-muted text-devoc-text-secondary border-devoc-border'
                      }`}
                    >
                      {member.role === 'org_admin' ? 'Organization Admin' : 'Standard Member'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={member.status || 'active'} />
                  </td>
                  <td className="py-2.5 px-3">
                    {member.linkedPerson ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-devoc-text-primary font-medium">
                          {member.linkedPerson.firstName} {member.linkedPerson.lastName}
                        </span>
                        <button
                          onClick={() => unlinkUser(member.linkedPerson!.id)}
                          title="Unlink from Person profile"
                          className="text-devoc-text-muted hover:text-red-400 p-0.5 rounded transition-colors"
                        >
                          <Unlink className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setSelectedPersonId(availablePeople[0]?.id || '');
                          setErrorMsg('');
                          setIsLinkModalOpen(true);
                        }}
                        className="text-amber-500 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Link to Person
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-devoc-text-muted text-[11px]">
                    {member.createdAt || member.joinedAt
                      ? new Date(member.createdAt || member.joinedAt || '').toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          setSelectedMember(member);
                          setTargetRole(member.role);
                          setErrorMsg('');
                          setIsRoleModalOpen(true);
                        }}
                      >
                        Role
                      </Button>
                      {member.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-red-400 border-red-500/20 hover:bg-red-500/10"
                          onClick={() => {
                            setSelectedMember(member);
                            setTargetStatus('suspended');
                            setErrorMsg('');
                            setIsStatusModalOpen(true);
                          }}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-green-400 border-green-500/20 hover:bg-green-500/10"
                          onClick={() => {
                            setSelectedMember(member);
                            setTargetStatus('active');
                            setErrorMsg('');
                            setIsStatusModalOpen(true);
                          }}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Organization Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Email Address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Organization Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="org_member">Standard Member</option>
                <option value="org_admin">Organization Administrator</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isInviting}>
                {isInviting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Organization Member Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRoleChangeSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="text-xs text-devoc-text-muted">
              Changing role for member: <strong className="text-devoc-text-primary">{selectedMember?.email}</strong>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">New Access Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="org_member">Standard Member</option>
                <option value="org_admin">Organization Administrator</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Status (Danger Confirmation Dialog) */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Confirm Member Status Change
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStatusChangeSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="text-xs text-devoc-text-muted">
              Are you sure you want to change the status of{' '}
              <strong className="text-devoc-text-primary">{selectedMember?.email}</strong> to{' '}
              <strong className="uppercase font-mono text-devoc-text-primary">{targetStatus}</strong>?
            </p>
            {targetStatus === 'suspended' && (
              <p className="text-[11px] text-amber-500/90 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                Suspended members cannot log in or access tenant resources until reactivated.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={targetStatus === 'suspended' ? 'danger' : 'primary'}
                size="sm"
              >
                Confirm {targetStatus === 'suspended' ? 'Suspension' : 'Activation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link User to Person Dialog */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link User Identity to Person Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkUserSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="text-xs text-devoc-text-muted">
              Linking login identity: <strong className="text-devoc-text-primary">{selectedMember?.email}</strong>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Select Unlinked Person</label>
              {availablePeople.length > 0 ? (
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
                  required
                >
                  {availablePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 text-xs text-devoc-text-muted rounded border border-dashed border-devoc-border bg-devoc-surface-muted">
                  No unlinked Person profiles found. Please create a Person record in People Administration first.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={availablePeople.length === 0}>
                Confirm Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

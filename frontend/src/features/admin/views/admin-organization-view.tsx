'use client';

import React, { useState } from 'react';
import { Building2, Globe, MapPin, CheckCircle2, Clock, Edit2 } from 'lucide-react';
import { useAdminOrganization } from '../hooks/use-admin-organization';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';

export function AdminOrganizationView() {
  const { organization, settings, branches, isLoading, updateProfile, isUpdatingProfile } =
    useAdminOrganization();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const openEditDialog = () => {
    setOrgName(organization?.name || '');
    setErrorMsg('');
    setIsEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setErrorMsg('Organization name cannot be empty');
      return;
    }
    try {
      await updateProfile({ name: orgName.trim() });
      setIsEditOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update organization profile');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-devoc-surface-muted animate-pulse rounded" />
        <div className="h-48 bg-devoc-surface-muted animate-pulse rounded border border-devoc-border" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Organization Profile & Architecture
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Tenant boundaries, profile metadata, operational defaults, and branch overview
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1.5 text-xs">
          <Edit2 className="h-3.5 w-3.5" />
          Edit Profile
        </Button>
      </div>

      {/* Main Profile Card */}
      <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-devoc-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-devoc-surface-muted border border-devoc-border text-devoc-text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-devoc-text-primary">{organization?.name}</h2>
              <span className="text-xs font-mono text-devoc-text-muted">Slug: {organization?.slug}</span>
            </div>
          </div>
          <StatusBadge status={organization?.status || 'active'} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-devoc-text-muted block text-[11px]">Organization Identifier</span>
            <span className="font-mono text-devoc-text-primary text-[11px] select-all bg-devoc-surface-muted px-1.5 py-0.5 rounded border border-devoc-border">
              {organization?.id}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-devoc-text-muted block text-[11px]">Primary Domain</span>
            <span className="text-devoc-text-primary">{organization?.domain || 'Standard Cloud Instance'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-devoc-text-muted block text-[11px]">Registered Date</span>
            <span className="text-devoc-text-primary">
              {organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Configuration Summary */}
      <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
        <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
          Operational Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded border border-devoc-border bg-devoc-surface-muted/50 space-y-1">
            <span className="text-[10px] text-devoc-text-muted uppercase tracking-wider block">Timezone</span>
            <span className="font-mono text-devoc-text-primary font-medium">{settings?.timezone || settings?.timeZone || 'UTC'}</span>
          </div>
          <div className="p-3 rounded border border-devoc-border bg-devoc-surface-muted/50 space-y-1">
            <span className="text-[10px] text-devoc-text-muted uppercase tracking-wider block">Locale</span>
            <span className="font-mono text-devoc-text-primary font-medium">{settings?.locale || 'en-US'}</span>
          </div>
          <div className="p-3 rounded border border-devoc-border bg-devoc-surface-muted/50 space-y-1">
            <span className="text-[10px] text-devoc-text-muted uppercase tracking-wider block">Reporting Currency</span>
            <span className="font-mono text-devoc-text-primary font-medium">{settings?.currency || settings?.defaultCurrency || 'USD'}</span>
          </div>
          <div className="p-3 rounded border border-devoc-border bg-devoc-surface-muted/50 space-y-1">
            <span className="text-[10px] text-devoc-text-muted uppercase tracking-wider block">Date & Time Format</span>
            <span className="font-mono text-devoc-text-primary font-medium">
              {settings?.dateFormat || 'YYYY-MM-DD'} ({settings?.timeFormat || '24h'})
            </span>
          </div>
        </div>
      </div>

      {/* Branches Registered */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
            Physical Operating Branches ({branches.length})
          </h3>
        </div>

        {branches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map((b) => (
              <div key={b.id} className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-devoc-text-primary">{b.name}</h4>
                    <span className="text-[10px] font-mono text-devoc-text-muted">{b.code}</span>
                  </div>
                  <StatusBadge status={b.status || 'active'} />
                </div>
                {b.location && (
                  <div className="text-[11px] text-devoc-text-muted flex items-center gap-1 pt-1">
                    <MapPin className="h-3 w-3" />
                    {b.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded border border-dashed border-devoc-border bg-devoc-surface text-center text-xs text-devoc-text-muted">
            No physical branches registered. All operations mapped to organization primary location.
          </div>
        )}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Organization Name</label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. DeVoc Official"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

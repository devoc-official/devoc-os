'use client';

import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Edit2, RotateCcw, AlertTriangle, Check, Info } from 'lucide-react';
import { useAdminFeatures } from '../hooks/use-admin-features';
import { FeatureConfiguration } from '../../../api/admin.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';

export function AdminFeaturesView() {
  const { features, isLoading, setFeatureOverride, isSettingOverride, deleteFeatureOverride } =
    useAdminFeatures();

  const [selectedFeature, setSelectedFeature] = useState<FeatureConfiguration | null>(null);
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [overrideJson, setOverrideJson] = useState('{}');
  const [overrideDesc, setOverrideDesc] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openOverrideDialog = (f: FeatureConfiguration) => {
    setSelectedFeature(f);
    setOverrideEnabled(f.isEnabled);
    setOverrideJson(JSON.stringify(f.configValue || f.configurationPayload || {}, null, 2));
    setOverrideDesc(f.description || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeature) return;
    setErrorMsg('');

    let parsedConfig: Record<string, any> = {};
    try {
      if (overrideJson.trim()) {
        parsedConfig = JSON.parse(overrideJson);
      }
    } catch {
      setErrorMsg('Invalid JSON configuration payload');
      return;
    }

    try {
      await setFeatureOverride({
        featureKey: selectedFeature.featureKey,
        isEnabled: overrideEnabled,
        config: parsedConfig,
        description: overrideDesc,
      });
      setIsModalOpen(false);
      setSelectedFeature(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update feature configuration');
    }
  };

  const handleResetToDefault = async (featureKey: string) => {
    if (!confirm(`Are you sure you want to reset feature override for '${featureKey}' to system default?`)) return;
    try {
      await deleteFeatureOverride(featureKey);
    } catch (err: any) {
      alert(err.message || 'Failed to delete feature override');
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
            Feature Configuration & Toggles
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Tenant-scoped feature flags, operational overrides, and dynamic module payloads (M12)
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface text-xs text-devoc-text-muted space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-devoc-text-primary">
          <Info className="h-4 w-4 text-devoc-accent" />
          Server-Enforced Feature Flags
        </div>
        <p>
          Feature flags in DeVoc OS are validated and enforced server-side. Setting an override modifies your tenant's configuration in the database and records an immutable audit trail event.
        </p>
      </div>

      {/* Feature Table */}
      <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
            <tr>
              <th className="py-2.5 px-3">Feature Key</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3">Resolution Source</th>
              <th className="py-2.5 px-3">State</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-devoc-border text-devoc-text-primary font-mono text-[11px]">
            {features.map((f) => {
              const isOverride = f.source === 'organization_override';

              return (
                <tr key={f.featureKey} className="hover:bg-devoc-surface-hover transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-devoc-text-primary">
                    {f.featureKey}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-devoc-text-muted">
                    {f.description || 'System capability feature flag'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] border uppercase ${
                        isOverride
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-devoc-surface-muted text-devoc-text-muted border-devoc-border'
                      }`}
                    >
                      {f.source || 'platform_default'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={f.isEnabled ? 'active' : 'inactive'} />
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openOverrideDialog(f)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Configure
                      </Button>
                      {isOverride && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-amber-500 border-amber-500/20 hover:bg-amber-500/10 gap-1"
                          onClick={() => handleResetToDefault(f.featureKey)}
                          title="Reset override to platform default"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
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

      {/* Override Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Feature Override</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOverrideSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1">
              <span className="text-xs text-devoc-text-muted">Feature Identifier</span>
              <div className="font-mono text-xs font-bold text-devoc-text-primary select-all">
                {selectedFeature?.featureKey}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded border border-devoc-border bg-devoc-surface-muted/50">
              <div>
                <span className="text-xs font-semibold text-devoc-text-primary block">Feature Enabled</span>
                <span className="text-[11px] text-devoc-text-muted">
                  Controls availability of this module for this tenant
                </span>
              </div>
              <input
                type="checkbox"
                checked={overrideEnabled}
                onChange={(e) => setOverrideEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-devoc-border text-devoc-accent focus:ring-devoc-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">
                Configuration Payload (JSON)
              </label>
              <textarea
                value={overrideJson}
                onChange={(e) => setOverrideJson(e.target.value)}
                rows={5}
                className="w-full text-xs font-mono rounded-md border border-devoc-border bg-devoc-surface p-2.5 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
                placeholder="{}"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">
                Override Description / Rationale
              </label>
              <Input
                value={overrideDesc}
                onChange={(e) => setOverrideDesc(e.target.value)}
                placeholder="Why this override was configured"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSettingOverride}>
                {isSettingOverride ? 'Saving...' : 'Save Feature Override'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertTriangle, Globe, Clock, DollarSign, Building2 } from 'lucide-react';
import { useAdminSettings } from '../hooks/use-admin-settings';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

export function AdminSettingsView() {
  const { settings, branches, businessUnits, isLoading, updateSettings, isUpdating } =
    useAdminSettings();

  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en-US');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [defaultBranchId, setDefaultBranchId] = useState('');
  const [defaultBuId, setDefaultBuId] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setTimezone(settings.timezone || settings.timeZone || 'UTC');
      setLocale(settings.locale || 'en-US');
      setCurrency(settings.currency || settings.defaultCurrency || 'USD');
      setDateFormat(settings.dateFormat || 'YYYY-MM-DD');
      setTimeFormat(settings.timeFormat || '24h');
      setDefaultBranchId(settings.defaultBranchId || '');
      setDefaultBuId(settings.defaultBusinessUnitId || '');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      await updateSettings({
        timezone,
        locale,
        currency,
        dateFormat,
        timeFormat,
        defaultBranchId: defaultBranchId || null,
        defaultBusinessUnitId: defaultBuId || null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update operational settings');
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Operational Settings
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Global tenant parameters, localization, reporting currency, and organizational defaults (M12)
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {saveSuccess && (
          <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Operational settings saved successfully.
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {errorMsg}
          </div>
        )}

        {/* Localization & Region */}
        <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
          <div className="flex items-center gap-2 border-b border-devoc-border pb-3">
            <Globe className="h-4 w-4 text-devoc-text-secondary" />
            <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
              Localization & Region
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Operational Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">System Locale</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="en-US">English (United States) - en-US</option>
                <option value="en-GB">English (United Kingdom) - en-GB</option>
                <option value="de-DE">German (Germany) - de-DE</option>
                <option value="fr-FR">French (France) - fr-FR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Currency & Formats */}
        <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
          <div className="flex items-center gap-2 border-b border-devoc-border pb-3">
            <Clock className="h-4 w-4 text-devoc-text-secondary" />
            <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
              Formats & Currency
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Reporting Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="AED">AED (د.إ - UAE Dirham)</option>
                <option value="INR">INR (₹ - Indian Rupee)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Time Display</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as any)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Organizational Defaults */}
        <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
          <div className="flex items-center gap-2 border-b border-devoc-border pb-3">
            <Building2 className="h-4 w-4 text-devoc-text-secondary" />
            <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
              Organizational Defaults
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Default Primary Branch</label>
              <select
                value={defaultBranchId}
                onChange={(e) => setDefaultBranchId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None (Explicit branch selection)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Default Business Unit</label>
              <select
                value={defaultBuId}
                onChange={(e) => setDefaultBuId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None (Explicit BU assignment)</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name} ({bu.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" disabled={isUpdating} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isUpdating ? 'Saving Operational Settings...' : 'Save Operational Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

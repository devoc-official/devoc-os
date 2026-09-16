'use client';

import React, { useState } from 'react';
import {
  Network,
  Building2,
  FolderTree,
  Users,
  Plus,
  Edit2,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useAdminStructure } from '../hooks/use-admin-structure';
import { Tabs, TabList, TabTrigger, TabContent } from '../../../components/ui/tabs';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';

export function AdminStructureView() {
  const {
    branches,
    businessUnits,
    departments,
    teams,
    people,
    peopleMap,
    buMap,
    deptMap,
    isLoading,
    createBranch,
    updateBranch,
    createBusinessUnit,
    updateBusinessUnit,
    createDepartment,
    updateDepartment,
    createTeam,
    updateTeam,
  } = useAdminStructure();

  const [activeTab, setActiveTab] = useState<'branches' | 'business_units' | 'departments' | 'teams'>('business_units');

  // Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchEditId, setBranchEditId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchStatus, setBranchStatus] = useState<'active' | 'inactive'>('active');

  // BU Modal
  const [isBuModalOpen, setIsBuModalOpen] = useState(false);
  const [buEditId, setBuEditId] = useState<string | null>(null);
  const [buName, setBuName] = useState('');
  const [buCode, setBuCode] = useState('');
  const [buHeadPersonId, setBuHeadPersonId] = useState('');
  const [buStatus, setBuStatus] = useState<'active' | 'inactive'>('active');

  // Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptEditId, setDeptEditId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptBuId, setDeptBuId] = useState('');

  // Team Modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamEditId, setTeamEditId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamBuId, setTeamBuId] = useState('');
  const [teamDeptId, setTeamDeptId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Branch Handlers
  const openCreateBranch = () => {
    setBranchEditId(null);
    setBranchName('');
    setBranchCode('');
    setBranchLocation('');
    setBranchStatus('active');
    setErrorMsg('');
    setIsBranchModalOpen(true);
  };

  const openEditBranch = (b: any) => {
    setBranchEditId(b.id);
    setBranchName(b.name);
    setBranchCode(b.code);
    setBranchLocation(b.location || '');
    setBranchStatus(b.status || 'active');
    setErrorMsg('');
    setIsBranchModalOpen(true);
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (branchEditId) {
        await updateBranch({ id: branchEditId, data: { name: branchName, location: branchLocation, status: branchStatus } });
      } else {
        await createBranch({ name: branchName, code: branchCode, location: branchLocation, status: branchStatus });
      }
      setIsBranchModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save branch');
    }
  };

  // BU Handlers
  const openCreateBu = () => {
    setBuEditId(null);
    setBuName('');
    setBuCode('');
    setBuHeadPersonId('');
    setBuStatus('active');
    setErrorMsg('');
    setIsBuModalOpen(true);
  };

  const openEditBu = (bu: any) => {
    setBuEditId(bu.id);
    setBuName(bu.name);
    setBuCode(bu.code);
    setBuHeadPersonId(bu.headPersonId || '');
    setBuStatus(bu.status || 'active');
    setErrorMsg('');
    setIsBuModalOpen(true);
  };

  const handleBuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (buEditId) {
        await updateBusinessUnit({ id: buEditId, data: { name: buName, headPersonId: buHeadPersonId || null, status: buStatus } });
      } else {
        await createBusinessUnit({ name: buName, code: buCode, headPersonId: buHeadPersonId || null, status: buStatus });
      }
      setIsBuModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save business unit');
    }
  };

  // Department Handlers
  const openCreateDept = () => {
    setDeptEditId(null);
    setDeptName('');
    setDeptCode('');
    setDeptBuId(businessUnits[0]?.id || '');
    setErrorMsg('');
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept: any) => {
    setDeptEditId(dept.id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptBuId(dept.businessUnitId || '');
    setErrorMsg('');
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (deptEditId) {
        await updateDepartment({ id: deptEditId, data: { name: deptName, businessUnitId: deptBuId || null } });
      } else {
        await createDepartment({ name: deptName, code: deptCode, businessUnitId: deptBuId || null });
      }
      setIsDeptModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save department');
    }
  };

  // Team Handlers
  const openCreateTeam = () => {
    setTeamEditId(null);
    setTeamName('');
    setTeamCode('');
    setTeamBuId(businessUnits[0]?.id || '');
    setTeamDeptId(departments[0]?.id || '');
    setErrorMsg('');
    setIsTeamModalOpen(true);
  };

  const openEditTeam = (team: any) => {
    setTeamEditId(team.id);
    setTeamName(team.name);
    setTeamCode(team.code);
    setTeamBuId(team.businessUnitId || '');
    setTeamDeptId(team.departmentId || '');
    setErrorMsg('');
    setIsTeamModalOpen(true);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (teamEditId) {
        await updateTeam({ id: teamEditId, data: { name: teamName, departmentId: teamDeptId || null, businessUnitId: teamBuId || null } });
      } else {
        await createTeam({ name: teamName, code: teamCode, departmentId: teamDeptId || null, businessUnitId: teamBuId || null });
      }
      setIsTeamModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save team');
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
            Business Structure Administration
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Configure branches, business units, departments, and teams without flattening organizational relationships
          </p>
        </div>
      </div>

      <Tabs defaultValue="business_units" value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-devoc-border pb-2">
          <TabList>
            <TabTrigger value="business_units">
              Business Units ({businessUnits.length})
            </TabTrigger>
            <TabTrigger value="branches">
              Branches ({branches.length})
            </TabTrigger>
            <TabTrigger value="departments">
              Departments ({departments.length})
            </TabTrigger>
            <TabTrigger value="teams">
              Teams ({teams.length})
            </TabTrigger>
          </TabList>

          <div>
            {activeTab === 'business_units' && (
              <Button size="sm" onClick={openCreateBu} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Business Unit
              </Button>
            )}
            {activeTab === 'branches' && (
              <Button size="sm" onClick={openCreateBranch} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Branch
              </Button>
            )}
            {activeTab === 'departments' && (
              <Button size="sm" onClick={openCreateDept} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Department
              </Button>
            )}
            {activeTab === 'teams' && (
              <Button size="sm" onClick={openCreateTeam} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Team
              </Button>
            )}
          </div>
        </div>

        {/* Business Units Tab */}
        <TabContent value="business_units" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Business Unit</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Designated Head</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {businessUnits.map((bu) => (
                  <tr key={bu.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{bu.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{bu.code}</td>
                    <td className="py-2.5 px-3">
                      {bu.headPersonId && peopleMap.has(bu.headPersonId) ? (
                        <span className="font-medium text-devoc-text-primary">
                          {peopleMap.get(bu.headPersonId)}
                        </span>
                      ) : (
                        <span className="text-devoc-text-muted italic">No Head Designated</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={bu.status || 'active'} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openEditBu(bu)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Branches Tab */}
        <TabContent value="branches" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Branch Location</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Physical Address / Geo</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{b.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{b.code}</td>
                    <td className="py-2.5 px-3 text-devoc-text-muted">
                      {b.location || 'Primary Campus'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={b.status || 'active'} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openEditBranch(b)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Departments Tab */}
        <TabContent value="departments" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Parent Business Unit</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{dept.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{dept.code}</td>
                    <td className="py-2.5 px-3">
                      {dept.businessUnitId && buMap.has(dept.businessUnitId) ? (
                        <span className="font-medium text-devoc-text-primary">
                          {buMap.get(dept.businessUnitId)}
                        </span>
                      ) : (
                        <span className="text-devoc-text-muted italic">Unattached</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openEditDept(dept)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Teams Tab */}
        <TabContent value="teams" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Team Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Business Unit Context</th>
                  <th className="py-2.5 px-3">Department Context</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{t.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{t.code}</td>
                    <td className="py-2.5 px-3">
                      {t.businessUnitId && buMap.has(t.businessUnitId) ? (
                        <span>{buMap.get(t.businessUnitId)}</span>
                      ) : (
                        <span className="text-devoc-text-muted italic">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {t.departmentId && deptMap.has(t.departmentId) ? (
                        <span>{deptMap.get(t.departmentId)}</span>
                      ) : (
                        <span className="text-devoc-text-muted italic">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openEditTeam(t)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>
      </Tabs>

      {/* BU Dialog */}
      <Dialog open={isBuModalOpen} onOpenChange={setIsBuModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{buEditId ? 'Edit Business Unit' : 'Create Business Unit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBuSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Name</label>
              <Input
                value={buName}
                onChange={(e) => setBuName(e.target.value)}
                placeholder="e.g. Software Engineering"
                required
              />
            </div>
            {!buEditId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Code (Unique)</label>
                <Input
                  value={buCode}
                  onChange={(e) => setBuCode(e.target.value)}
                  placeholder="e.g. ENG"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Designated Head</label>
              <select
                value={buHeadPersonId}
                onChange={(e) => setBuHeadPersonId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None Designated</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Status</label>
              <select
                value={buStatus}
                onChange={(e) => setBuStatus(e.target.value as any)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBuModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {buEditId ? 'Save Changes' : 'Create Business Unit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{branchEditId ? 'Edit Branch' : 'Create Operating Branch'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBranchSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Branch Name</label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. London HQ"
                required
              />
            </div>
            {!branchEditId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Code (Unique)</label>
                <Input
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="e.g. LON-01"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Location / Address</label>
              <Input
                value={branchLocation}
                onChange={(e) => setBranchLocation(e.target.value)}
                placeholder="e.g. 10 Finsbury Sq, London"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Status</label>
              <select
                value={branchStatus}
                onChange={(e) => setBranchStatus(e.target.value as any)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBranchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {branchEditId ? 'Save Changes' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{deptEditId ? 'Edit Department' : 'Create Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDeptSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Name</label>
              <Input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Platform Architecture"
                required
              />
            </div>
            {!deptEditId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Code</label>
                <Input
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="e.g. PLAT-ARCH"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Parent Business Unit</label>
              <select
                value={deptBuId}
                onChange={(e) => setDeptBuId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {deptEditId ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{teamEditId ? 'Edit Team' : 'Create Team'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTeamSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Name</label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Core Engine Pod"
                required
              />
            </div>
            {!teamEditId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Code</label>
                <Input
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="e.g. POD-CORE"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Business Unit Context</label>
              <select
                value={teamBuId}
                onChange={(e) => setTeamBuId(e.target.value)}
                className="w-full text-xs rounded-md border border-devoc-border bg-devoc-surface p-2 text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">None</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Department Context</label>
              <select
                value={teamDeptId}
                onChange={(e) => setTeamDeptId(e.target.value)}
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
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsTeamModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {teamEditId ? 'Save Changes' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

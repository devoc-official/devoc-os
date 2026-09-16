'use client';

import React, { useState } from 'react';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAdminMasterData } from '../hooks/use-admin-master-data';
import { Tabs, TabList, TabTrigger, TabContent } from '../../../components/ui/tabs';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';

export function AdminMasterDataView() {
  const {
    workCategories,
    meetingTypes,
    evaluationTemplates,
    financeCategories,
    skills,
    isLoading,
    createWorkCategory,
    updateWorkCategory,
    retireWorkCategory,
    createMeetingType,
    updateMeetingType,
    retireMeetingType,
    createEvaluationTemplate,
    updateEvaluationTemplate,
    createFinanceCategory,
    updateFinanceCategory,
    retireFinanceCategory,
    createSkill,
    updateSkill,
  } = useAdminMasterData();

  const [activeTab, setActiveTab] = useState<
    'work_categories' | 'meeting_types' | 'eval_templates' | 'finance_categories' | 'skills'
  >('work_categories');

  // Generic modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldCode, setFieldCode] = useState('');
  const [fieldDesc, setFieldDesc] = useState('');
  const [fieldType, setFieldType] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const openCreate = () => {
    setEditId(null);
    setFieldName('');
    setFieldCode('');
    setFieldDesc('');
    setFieldType('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setFieldName(item.name);
    setFieldCode(item.code || '');
    setFieldDesc(item.description || '');
    setFieldType(item.type || item.category || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (activeTab === 'work_categories') {
        if (editId) {
          await updateWorkCategory({ id: editId, data: { name: fieldName, description: fieldDesc } });
        } else {
          await createWorkCategory({ name: fieldName, code: fieldCode, description: fieldDesc });
        }
      } else if (activeTab === 'meeting_types') {
        if (editId) {
          await updateMeetingType({ id: editId, data: { name: fieldName, description: fieldDesc } });
        } else {
          await createMeetingType({ name: fieldName, code: fieldCode, description: fieldDesc });
        }
      } else if (activeTab === 'eval_templates') {
        if (editId) {
          await updateEvaluationTemplate({ id: editId, data: { name: fieldName, description: fieldDesc } });
        } else {
          await createEvaluationTemplate({ name: fieldName, code: fieldCode, description: fieldDesc });
        }
      } else if (activeTab === 'finance_categories') {
        if (editId) {
          await updateFinanceCategory({ id: editId, data: { name: fieldName, type: fieldType } });
        } else {
          await createFinanceCategory({ name: fieldName, code: fieldCode, type: fieldType });
        }
      } else if (activeTab === 'skills') {
        if (editId) {
          await updateSkill({ id: editId, data: { name: fieldName, category: fieldType, description: fieldDesc } });
        } else {
          await createSkill({ name: fieldName, category: fieldType, description: fieldDesc });
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save master data entry');
    }
  };

  const handleRetire = async (id: string) => {
    if (!confirm('Are you sure you want to retire this master data category?')) return;
    try {
      if (activeTab === 'work_categories') {
        await retireWorkCategory(id);
      } else if (activeTab === 'meeting_types') {
        await retireMeetingType(id);
      } else if (activeTab === 'finance_categories') {
        await retireFinanceCategory(id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to retire category');
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
            Configurable Master Data
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            Enterprise taxonomies, work categories, meeting types, evaluation dimensions, and skills
          </p>
        </div>
      </div>

      <Tabs defaultValue="work_categories" value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-devoc-border pb-2">
          <TabList>
            <TabTrigger value="work_categories">
              Work Categories ({workCategories.length})
            </TabTrigger>
            <TabTrigger value="meeting_types">
              Meeting Types ({meetingTypes.length})
            </TabTrigger>
            <TabTrigger value="eval_templates">
              Evaluation Templates ({evaluationTemplates.length})
            </TabTrigger>
            <TabTrigger value="finance_categories">
              Finance Categories ({financeCategories.length})
            </TabTrigger>
            <TabTrigger value="skills">
              Skills ({skills.length})
            </TabTrigger>
          </TabList>

          <Button size="sm" onClick={openCreate} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </Button>
        </div>

        {/* Work Categories */}
        <TabContent value="work_categories" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {workCategories.map((wc) => (
                  <tr key={wc.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{wc.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{wc.code}</td>
                    <td className="py-2.5 px-3 text-devoc-text-muted">{wc.description || '—'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={wc.isActive ? 'active' : 'archived'} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          onClick={() => openEdit(wc)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        {wc.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-red-400 border-red-500/20 hover:bg-red-500/10 gap-1"
                            onClick={() => handleRetire(wc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Retire
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Meeting Types */}
        <TabContent value="meeting_types" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Meeting Type</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {meetingTypes.map((mt) => (
                  <tr key={mt.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{mt.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{mt.code}</td>
                    <td className="py-2.5 px-3 text-devoc-text-muted">{mt.description || '—'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={mt.isActive ? 'active' : 'archived'} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          onClick={() => openEdit(mt)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        {mt.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-red-400 border-red-500/20 hover:bg-red-500/10 gap-1"
                            onClick={() => handleRetire(mt.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Retire
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Evaluation Templates */}
        <TabContent value="eval_templates" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Template Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {evaluationTemplates.map((et) => (
                  <tr key={et.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{et.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{et.code}</td>
                    <td className="py-2.5 px-3 text-devoc-text-muted">{et.description || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openEdit(et)}
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

        {/* Finance Categories */}
        <TabContent value="finance_categories" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Category Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {financeCategories.map((fc) => (
                  <tr key={fc.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{fc.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-muted">{fc.code}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-secondary">{fc.type || 'Operational'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={fc.isActive ? 'active' : 'archived'} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          onClick={() => openEdit(fc)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        {fc.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-red-400 border-red-500/20 hover:bg-red-500/10 gap-1"
                            onClick={() => handleRetire(fc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Retire
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Skills */}
        <TabContent value="skills" className="space-y-3">
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Skill Name</th>
                  <th className="py-2.5 px-3">Category / Domain</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {skills.map((s) => (
                  <tr key={s.id} className="hover:bg-devoc-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono text-devoc-text-secondary">{s.category || 'Engineering'}</td>
                    <td className="py-2.5 px-3 text-devoc-text-muted">{s.description || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openEdit(s)}
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

      {/* Deferred Capabilities Notice (Section 10 & 28 Compliance) */}
      <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface text-xs text-devoc-text-muted space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-devoc-text-secondary uppercase tracking-wider text-[10px]">
          <Info className="h-3.5 w-3.5 text-devoc-accent" />
          Extended Master Data Governance
        </div>
        <p>
          Specialized payroll schemes, tax codes, benefits matrices, and external CRM connectors are deferred to future ecosystem releases. All active master data records above map directly to verified M1–M15 domain engines.
        </p>
      </div>

      {/* Entry Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Master Data Entry' : 'Create Master Data Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-devoc-text-primary">Name</label>
              <Input
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. Code Review"
                required
              />
            </div>
            {!editId && activeTab !== 'skills' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Code (Unique)</label>
                <Input
                  value={fieldCode}
                  onChange={(e) => setFieldCode(e.target.value)}
                  placeholder="e.g. REV_CODE"
                  required
                />
              </div>
            )}
            {(activeTab === 'finance_categories' || activeTab === 'skills') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Type / Category</label>
                <Input
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  placeholder="e.g. Backend, Tuition, Operational"
                />
              </div>
            )}
            {activeTab !== 'finance_categories' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-devoc-text-primary">Description</label>
                <Input
                  value={fieldDesc}
                  onChange={(e) => setFieldDesc(e.target.value)}
                  placeholder="Optional context or definition"
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {editId ? 'Save Changes' : 'Create Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useFounderFinance } from '../hooks/use-founder-finance';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Obligation, FinancialTransaction, OperationalBudget } from '../../../api/finance.api';
import {
  TrendingUp,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
} from 'lucide-react';

export function FounderFinanceView() {
  const {
    obligations,
    transactions,
    budgets,
    buMap,
    totalInflow,
    totalOutflow,
    netCashFlow,
    outstandingReceivables,
    outstandingPayables,
    overdueObligations,
    totalBudgeted,
    isLoading,
  } = useFounderFinance();

  const [activeTab, setActiveTab] = useState<'obligations' | 'transactions' | 'budgets'>('obligations');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredObligations = obligations.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.title.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
  });

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      (t.referenceNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  const obligationColumns: Column<Obligation>[] = [
    {
      key: 'id',
      header: 'Reference',
      width: '130px',
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">
          #{o.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Description',
      render: (o) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">{o.title}</div>
          {o.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{o.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'direction',
      header: 'Flow',
      width: '120px',
      render: (o) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase ${
            o.direction === 'receivable' ? 'text-emerald-600' : 'text-blue-600'
          }`}
        >
          {o.direction === 'receivable' ? (
            <ArrowDownLeft className="h-3 w-3" />
          ) : (
            <ArrowUpRight className="h-3 w-3" />
          )}
          {o.direction}
        </span>
      ),
    },
    {
      key: 'netAmount',
      header: 'Net Total',
      width: '130px',
      align: 'right',
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-primary">
          {o.currency} {Number(o.netAmount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'balanceAmount',
      header: 'Outstanding Balance',
      width: '140px',
      align: 'right',
      render: (o) => (
        <span
          className={`font-mono text-xs font-semibold ${
            Number(o.balanceAmount) > 0 ? 'text-amber-600' : 'text-devoc-text-muted'
          }`}
        >
          {o.currency} {Number(o.balanceAmount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      width: '110px',
      render: (o) => <StatusBadge status={o.state.toLowerCase()} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      width: '120px',
      render: (o) => (
        <span className="text-[11px] text-devoc-text-muted">
          {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : 'Immediate'}
        </span>
      ),
    },
  ];

  const transactionColumns: Column<FinancialTransaction>[] = [
    {
      key: 'id',
      header: 'Transaction #',
      width: '140px',
      render: (t) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">
          #{t.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'Type',
      width: '110px',
      render: (t) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase ${
            t.direction === 'inflow' ? 'text-emerald-600' : 'text-blue-600'
          }`}
        >
          {t.direction === 'inflow' ? '+' : '-'} {t.direction}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '130px',
      align: 'right',
      render: (t) => (
        <span
          className={`font-mono text-xs font-bold ${
            t.direction === 'inflow' ? 'text-emerald-600' : 'text-devoc-text-primary'
          }`}
        >
          {t.currency} {Number(t.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'paymentMode',
      header: 'Method',
      width: '140px',
      render: (t) => (
        <span className="text-xs text-devoc-text-secondary uppercase">
          {t.paymentMode ? t.paymentMode.replace('_', ' ') : 'Standard'}
        </span>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Bank / External Ref',
      render: (t) => (
        <span className="font-mono text-xs text-devoc-text-muted">
          {t.referenceNumber || 'N/A'}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'Status',
      width: '110px',
      render: (t) => <StatusBadge status={t.state.toLowerCase()} />,
    },
    {
      key: 'createdAt',
      header: 'Posted Date',
      width: '120px',
      render: (t) => (
        <span className="text-[11px] text-devoc-text-muted">
          {new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const budgetColumns: Column<OperationalBudget>[] = [
    {
      key: 'businessUnitId',
      header: 'Business Unit',
      render: (b) => {
        const buName = b.businessUnitId ? buMap.get(b.businessUnitId) : null;
        return (
          <span className="font-semibold text-xs text-devoc-text-primary flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-devoc-accent" />
            {buName || (b.businessUnitId ? `BU #${b.businessUnitId.slice(0, 8)}` : 'Organization General')}
          </span>
        );
      },
    },
    {
      key: 'periodName',
      header: 'Period',
      width: '140px',
      render: (b) => <span className="text-xs text-devoc-text-secondary font-medium">{b.periodName}</span>,
    },
    {
      key: 'budgetAmount',
      header: 'Allocated Budget',
      width: '160px',
      align: 'right',
      render: (b) => (
        <span className="font-mono text-xs font-bold text-devoc-text-primary">
          ${Number(b.budgetAmount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      render: (b) => (
        <span className="text-[11px] text-devoc-text-muted font-mono">
          {new Date(b.periodStart).toLocaleDateString()} → {new Date(b.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-devoc-accent" />
          Executive Finance & Operational Health
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Cash flow management, revenue receivables, fee obligations, operational expenditures, and BU budgets.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Net Posted Cash Flow</span>
          <span
            className={`text-lg font-bold font-mono ${
              netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            ${netCashFlow.toLocaleString()}
          </span>
          <span className="text-[10px] text-devoc-text-muted block mt-0.5">
            +${totalInflow.toLocaleString()} in / -${totalOutflow.toLocaleString()} out
          </span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Outstanding Receivables</span>
          <span className="text-lg font-bold font-mono text-amber-600">
            ${outstandingReceivables.toLocaleString()}
          </span>
          <span className="text-[10px] text-devoc-text-muted block mt-0.5">Uncollected fee & client invoices</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Outstanding Payables</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">
            ${outstandingPayables.toLocaleString()}
          </span>
          <span className="text-[10px] text-devoc-text-muted block mt-0.5">Committed operating obligations</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Allocated BU Budgets</span>
          <span className="text-lg font-bold font-mono text-devoc-accent">
            ${totalBudgeted.toLocaleString()}
          </span>
          <span className="text-[10px] text-devoc-text-muted block mt-0.5">Across {budgets.length} budget lines</span>
        </div>
      </div>

      {/* Overdue Warning */}
      {overdueObligations.length > 0 && (
        <div className="p-3 rounded-md border border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>
              {overdueObligations.length} obligation{overdueObligations.length > 1 ? 's' : ''} past due date
              requiring collection or reconciliation.
            </span>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 border-b sm:border-0 border-devoc-border w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('obligations')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'obligations'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Obligations & Invoices ({obligations.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'transactions'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Cash Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'budgets'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Operating Budgets ({budgets.length})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'obligations' && (
        <DataTable
          columns={obligationColumns}
          data={filteredObligations}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No obligations found"
          emptyDescription="No invoices or fee obligations recorded."
        />
      )}

      {activeTab === 'transactions' && (
        <DataTable
          columns={transactionColumns}
          data={filteredTransactions}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No transactions found"
          emptyDescription="No cash flow transactions recorded."
        />
      )}

      {activeTab === 'budgets' && (
        <DataTable
          columns={budgetColumns}
          data={budgets}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No budgets allocated"
          emptyDescription="No operational budgets registered for business units."
        />
      )}
    </div>
  );
}

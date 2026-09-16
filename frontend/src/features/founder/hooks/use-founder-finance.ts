'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { financeApi, Obligation, FinancialTransaction, OperationalBudget, FinanceCategory } from '../../../api/finance.api';
import { organizationApi } from '../../../api/organization.api';

export function useFounderFinance() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['founder', 'finance-categories', orgId],
    queryFn: () => financeApi.listCategories(orgId),
    enabled: Boolean(orgId),
  });

  const { data: obligations = [], isLoading: isObligationsLoading } = useQuery({
    queryKey: ['founder', 'finance-obligations', orgId],
    queryFn: () => financeApi.listObligations(orgId),
    enabled: Boolean(orgId),
  });

  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['founder', 'finance-transactions', orgId],
    queryFn: () => financeApi.listTransactions(orgId),
    enabled: Boolean(orgId),
  });

  const { data: budgets = [], isLoading: isBudgetsLoading } = useQuery({
    queryKey: ['founder', 'finance-budgets', orgId],
    queryFn: () => financeApi.listBudgets(orgId),
    enabled: Boolean(orgId),
  });

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['founder', 'bus', orgId],
    queryFn: () => organizationApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const buMap = new Map(businessUnits.map((bu) => [bu.id, bu.name]));

  // Revenue & Expense computations from posted transactions
  const totalInflow = transactions
    .filter((tx) => tx.direction === 'inflow' && tx.state === 'Posted')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const totalOutflow = transactions
    .filter((tx) => tx.direction === 'outflow' && tx.state === 'Posted')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const netCashFlow = totalInflow - totalOutflow;

  // Receivables & Payables from obligations
  const totalReceivables = obligations
    .filter((o) => o.direction === 'receivable')
    .reduce((sum, o) => sum + Number(o.netAmount || 0), 0);

  const outstandingReceivables = obligations
    .filter((o) => o.direction === 'receivable' && o.state !== 'Paid' && o.state !== 'Cancelled')
    .reduce((sum, o) => sum + Number(o.balanceAmount || 0), 0);

  const totalPayables = obligations
    .filter((o) => o.direction === 'payable')
    .reduce((sum, o) => sum + Number(o.netAmount || 0), 0);

  const outstandingPayables = obligations
    .filter((o) => o.direction === 'payable' && o.state !== 'Paid' && o.state !== 'Cancelled')
    .reduce((sum, o) => sum + Number(o.balanceAmount || 0), 0);

  const overdueObligations = obligations.filter((o) => o.state === 'Overdue');

  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0);

  return {
    categories,
    obligations,
    transactions,
    budgets,
    businessUnits,
    buMap,
    totalInflow,
    totalOutflow,
    netCashFlow,
    totalReceivables,
    outstandingReceivables,
    totalPayables,
    outstandingPayables,
    overdueObligations,
    totalBudgeted,
    isLoading:
      isCategoriesLoading ||
      isObligationsLoading ||
      isTransactionsLoading ||
      isBudgetsLoading,
  };
}

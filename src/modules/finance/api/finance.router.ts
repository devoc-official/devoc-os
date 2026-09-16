import { Router } from 'express';
import { FinanceCategoryController } from './finance-category.controller.js';
import { FinancialPartyController } from './financial-party.controller.js';
import { FinancialObligationController } from './financial-obligation.controller.js';
import { FinancialTransactionController } from './financial-transaction.controller.js';
import { FinancialBudgetController } from './financial-budget.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const financeRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

const catCtrl = new FinanceCategoryController();
const partyCtrl = new FinancialPartyController();
const obliCtrl = new FinancialObligationController();
const txCtrl = new FinancialTransactionController();
const budgetCtrl = new FinancialBudgetController();

// --- CATEGORIES ---
tenantProtected.get('/finance/categories', requireRole(['org_admin', 'org_member']), catCtrl.listCategories);
tenantProtected.post('/finance/categories', requireOrgAdmin, catCtrl.createCategory);
tenantProtected.put('/finance/categories/:id', requireOrgAdmin, catCtrl.updateCategory);

tenantProtected.get('/organizations/:organizationId/finance/categories', requireRole(['org_admin', 'org_member']), catCtrl.listCategories);
tenantProtected.post('/organizations/:organizationId/finance/categories', requireOrgAdmin, catCtrl.createCategory);
tenantProtected.put('/organizations/:organizationId/finance/categories/:id', requireOrgAdmin, catCtrl.updateCategory);

// --- PARTIES ---
tenantProtected.get('/finance/parties', requireRole(['org_admin', 'org_member']), partyCtrl.listParties);
tenantProtected.post('/finance/parties', requireOrgAdmin, partyCtrl.createParty);
tenantProtected.get('/finance/parties/:id', requireRole(['org_admin', 'org_member']), partyCtrl.getParty);
tenantProtected.put('/finance/parties/:id', requireOrgAdmin, partyCtrl.updateParty);

tenantProtected.get('/organizations/:organizationId/finance/parties', requireRole(['org_admin', 'org_member']), partyCtrl.listParties);
tenantProtected.post('/organizations/:organizationId/finance/parties', requireOrgAdmin, partyCtrl.createParty);
tenantProtected.get('/organizations/:organizationId/finance/parties/:id', requireRole(['org_admin', 'org_member']), partyCtrl.getParty);
tenantProtected.put('/organizations/:organizationId/finance/parties/:id', requireOrgAdmin, partyCtrl.updateParty);

// --- OBLIGATIONS ---
tenantProtected.get('/finance/obligations', requireRole(['org_admin', 'org_member']), obliCtrl.listObligations);
tenantProtected.post('/finance/obligations', requireOrgAdmin, obliCtrl.createObligation);
tenantProtected.get('/finance/obligations/:id', requireRole(['org_admin', 'org_member']), obliCtrl.getObligation);
tenantProtected.patch('/finance/obligations/:id', requireOrgAdmin, obliCtrl.updateObligation);
tenantProtected.put('/finance/obligations/:id', requireOrgAdmin, obliCtrl.updateObligation);
tenantProtected.post('/finance/obligations/:id/issue', requireOrgAdmin, obliCtrl.issueObligation);
tenantProtected.post('/finance/obligations/:id/cancel', requireOrgAdmin, obliCtrl.cancelObligation);
tenantProtected.post('/finance/obligations/:id/adjustments', requireOrgAdmin, obliCtrl.addAdjustment);

tenantProtected.get('/organizations/:organizationId/finance/obligations', requireRole(['org_admin', 'org_member']), obliCtrl.listObligations);
tenantProtected.post('/organizations/:organizationId/finance/obligations', requireOrgAdmin, obliCtrl.createObligation);
tenantProtected.get('/organizations/:organizationId/finance/obligations/:id', requireRole(['org_admin', 'org_member']), obliCtrl.getObligation);
tenantProtected.patch('/organizations/:organizationId/finance/obligations/:id', requireOrgAdmin, obliCtrl.updateObligation);
tenantProtected.put('/organizations/:organizationId/finance/obligations/:id', requireOrgAdmin, obliCtrl.updateObligation);
tenantProtected.post('/organizations/:organizationId/finance/obligations/:id/issue', requireOrgAdmin, obliCtrl.issueObligation);
tenantProtected.post('/organizations/:organizationId/finance/obligations/:id/cancel', requireOrgAdmin, obliCtrl.cancelObligation);
tenantProtected.post('/organizations/:organizationId/finance/obligations/:id/adjustments', requireOrgAdmin, obliCtrl.addAdjustment);

// --- TRANSACTIONS ---
tenantProtected.get('/finance/transactions', requireRole(['org_admin', 'org_member']), txCtrl.listTransactions);
tenantProtected.post('/finance/transactions', requireOrgAdmin, txCtrl.createTransaction);
tenantProtected.get('/finance/transactions/:id', requireRole(['org_admin', 'org_member']), txCtrl.getTransaction);
tenantProtected.post('/finance/transactions/:id/post', requireOrgAdmin, txCtrl.postTransaction);
tenantProtected.post('/finance/transactions/:id/reverse', requireOrgAdmin, txCtrl.reverseTransaction);

tenantProtected.get('/organizations/:organizationId/finance/transactions', requireRole(['org_admin', 'org_member']), txCtrl.listTransactions);
tenantProtected.post('/organizations/:organizationId/finance/transactions', requireOrgAdmin, txCtrl.createTransaction);
tenantProtected.get('/organizations/:organizationId/finance/transactions/:id', requireRole(['org_admin', 'org_member']), txCtrl.getTransaction);
tenantProtected.post('/organizations/:organizationId/finance/transactions/:id/post', requireOrgAdmin, txCtrl.postTransaction);
tenantProtected.post('/organizations/:organizationId/finance/transactions/:id/reverse', requireOrgAdmin, txCtrl.reverseTransaction);

// --- ALLOCATIONS & ADJUSTMENTS ---
tenantProtected.get('/finance/allocations', requireRole(['org_admin', 'org_member']), txCtrl.listAllocations);
tenantProtected.post('/finance/allocations', requireOrgAdmin, txCtrl.allocateTransaction);
tenantProtected.post('/finance/adjustments', requireOrgAdmin, obliCtrl.addAdjustment);

tenantProtected.get('/organizations/:organizationId/finance/allocations', requireRole(['org_admin', 'org_member']), txCtrl.listAllocations);
tenantProtected.post('/organizations/:organizationId/finance/allocations', requireOrgAdmin, txCtrl.allocateTransaction);
tenantProtected.post('/organizations/:organizationId/finance/adjustments', requireOrgAdmin, obliCtrl.addAdjustment);

// --- BUDGETS ---
tenantProtected.get('/finance/budgets', requireRole(['org_admin', 'org_member']), budgetCtrl.listBudgets);
tenantProtected.post('/finance/budgets', requireOrgAdmin, budgetCtrl.createBudget);
tenantProtected.get('/finance/budgets/:id', requireRole(['org_admin', 'org_member']), budgetCtrl.getBudget);
tenantProtected.put('/finance/budgets/:id', requireOrgAdmin, budgetCtrl.updateBudget);

tenantProtected.get('/organizations/:organizationId/finance/budgets', requireRole(['org_admin', 'org_member']), budgetCtrl.listBudgets);
tenantProtected.post('/organizations/:organizationId/finance/budgets', requireOrgAdmin, budgetCtrl.createBudget);
tenantProtected.get('/organizations/:organizationId/finance/budgets/:id', requireRole(['org_admin', 'org_member']), budgetCtrl.getBudget);
tenantProtected.put('/organizations/:organizationId/finance/budgets/:id', requireOrgAdmin, budgetCtrl.updateBudget);

financeRouter.use(tenantProtected);

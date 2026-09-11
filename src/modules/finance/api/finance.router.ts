import { Router } from 'express';
import { FinanceCategoryController } from './finance-category.controller.js';
import { FinancialPartyController } from './financial-party.controller.js';
import { FinancialObligationController } from './financial-obligation.controller.js';
import { FinancialTransactionController } from './financial-transaction.controller.js';
import { FinancialBudgetController } from './financial-budget.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';

export const financeRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

const catCtrl = new FinanceCategoryController();
const partyCtrl = new FinancialPartyController();
const obliCtrl = new FinancialObligationController();
const txCtrl = new FinancialTransactionController();
const budgetCtrl = new FinancialBudgetController();

// --- CATEGORIES ---
tenantProtected.get('/finance/categories', catCtrl.listCategories);
tenantProtected.post('/finance/categories', catCtrl.createCategory);
tenantProtected.put('/finance/categories/:id', catCtrl.updateCategory);

tenantProtected.get('/organizations/:organizationId/finance/categories', catCtrl.listCategories);
tenantProtected.post('/organizations/:organizationId/finance/categories', catCtrl.createCategory);
tenantProtected.put('/organizations/:organizationId/finance/categories/:id', catCtrl.updateCategory);

// --- PARTIES ---
tenantProtected.get('/finance/parties', partyCtrl.listParties);
tenantProtected.post('/finance/parties', partyCtrl.createParty);
tenantProtected.get('/finance/parties/:id', partyCtrl.getParty);
tenantProtected.put('/finance/parties/:id', partyCtrl.updateParty);

tenantProtected.get('/organizations/:organizationId/finance/parties', partyCtrl.listParties);
tenantProtected.post('/organizations/:organizationId/finance/parties', partyCtrl.createParty);
tenantProtected.get('/organizations/:organizationId/finance/parties/:id', partyCtrl.getParty);
tenantProtected.put('/organizations/:organizationId/finance/parties/:id', partyCtrl.updateParty);

// --- OBLIGATIONS ---
tenantProtected.get('/finance/obligations', obliCtrl.listObligations);
tenantProtected.post('/finance/obligations', obliCtrl.createObligation);
tenantProtected.get('/finance/obligations/:id', obliCtrl.getObligation);
tenantProtected.post('/finance/obligations/:id/issue', obliCtrl.issueObligation);
tenantProtected.post('/finance/obligations/:id/cancel', obliCtrl.cancelObligation);
tenantProtected.post('/finance/obligations/:id/adjustments', obliCtrl.addAdjustment);

tenantProtected.get('/organizations/:organizationId/finance/obligations', obliCtrl.listObligations);
tenantProtected.post('/organizations/:organizationId/finance/obligations', obliCtrl.createObligation);
tenantProtected.get('/organizations/:organizationId/finance/obligations/:id', obliCtrl.getObligation);
tenantProtected.post('/organizations/:organizationId/finance/obligations/:id/issue', obliCtrl.issueObligation);
tenantProtected.post('/organizations/:organizationId/finance/obligations/:id/cancel', obliCtrl.cancelObligation);
tenantProtected.post('/organizations/:organizationId/finance/obligations/:id/adjustments', obliCtrl.addAdjustment);

// --- TRANSACTIONS ---
tenantProtected.get('/finance/transactions', txCtrl.listTransactions);
tenantProtected.post('/finance/transactions', txCtrl.createTransaction);
tenantProtected.get('/finance/transactions/:id', txCtrl.getTransaction);
tenantProtected.post('/finance/transactions/:id/post', txCtrl.postTransaction);
tenantProtected.post('/finance/transactions/:id/reverse', txCtrl.reverseTransaction);

tenantProtected.get('/organizations/:organizationId/finance/transactions', txCtrl.listTransactions);
tenantProtected.post('/organizations/:organizationId/finance/transactions', txCtrl.createTransaction);
tenantProtected.get('/organizations/:organizationId/finance/transactions/:id', txCtrl.getTransaction);
tenantProtected.post('/organizations/:organizationId/finance/transactions/:id/post', txCtrl.postTransaction);
tenantProtected.post('/organizations/:organizationId/finance/transactions/:id/reverse', txCtrl.reverseTransaction);

// --- ALLOCATIONS ---
tenantProtected.get('/finance/allocations', txCtrl.listAllocations);
tenantProtected.post('/finance/allocations', txCtrl.allocateTransaction);

tenantProtected.get('/organizations/:organizationId/finance/allocations', txCtrl.listAllocations);
tenantProtected.post('/organizations/:organizationId/finance/allocations', txCtrl.allocateTransaction);

// --- BUDGETS ---
tenantProtected.get('/finance/budgets', budgetCtrl.listBudgets);
tenantProtected.post('/finance/budgets', budgetCtrl.createBudget);
tenantProtected.get('/finance/budgets/:id', budgetCtrl.getBudget);
tenantProtected.put('/finance/budgets/:id', budgetCtrl.updateBudget);

tenantProtected.get('/organizations/:organizationId/finance/budgets', budgetCtrl.listBudgets);
tenantProtected.post('/organizations/:organizationId/finance/budgets', budgetCtrl.createBudget);
tenantProtected.get('/organizations/:organizationId/finance/budgets/:id', budgetCtrl.getBudget);
tenantProtected.put('/organizations/:organizationId/finance/budgets/:id', budgetCtrl.updateBudget);

financeRouter.use(tenantProtected);

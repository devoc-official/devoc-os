import { Request, Response, NextFunction } from 'express';
import { FinancialTransactionService } from '../application/financial-transaction.service.js';
import { sendSuccess } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { TransactionState, PaymentMode } from '../domain/financial-transaction.entity.js';

const getOrgId = (req: Request): string => {
  const headerOrgId = req.headers['x-organization-id'];
  const paramOrgId = req.params.organizationId;
  const ctxOrgId = req.tenantContext?.organizationId;
  const orgId = (ctxOrgId || headerOrgId || paramOrgId) as string;
  if (!orgId) throw new ValidationError('Organization context is required');
  return Array.isArray(orgId) ? orgId[0] : orgId;
};

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class FinancialTransactionController {
  private service: FinancialTransactionService;

  constructor(service?: FinancialTransactionService) {
    this.service = service || new FinancialTransactionService();
  }

  public listTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { partyId, party_id, direction, state } = req.query;

      const pId = (partyId || party_id) as string;

      const transactions = await this.service.listTransactions(organizationId, {
        partyId: pId,
        direction: direction as string,
        state: state as TransactionState,
      });

      sendSuccess(res, transactions);
    } catch (err) {
      next(err);
    }
  };

  public createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const {
        party_id,
        partyId,
        direction,
        transaction_type,
        transactionType,
        amount,
        currency,
        payment_mode,
        paymentMode,
        reference_number,
        referenceNumber,
        notes,
        post_immediately,
        postImmediately,
      } = req.body;

      const pId = partyId || party_id;
      const tType = transactionType || transaction_type;
      const pMode = (paymentMode || payment_mode) as PaymentMode;
      const pImm = postImmediately !== undefined ? postImmediately : post_immediately;
      const refNum = referenceNumber || reference_number;

      if (!pId || !direction || amount === undefined || !pMode) {
        throw new ValidationError('partyId, direction, amount, and paymentMode are required');
      }

      const transaction = await this.service.createTransaction(
        organizationId,
        {
          partyId: pId,
          direction,
          transactionType: tType,
          amount: Number(amount),
          currency,
          paymentMode: pMode,
          referenceNumber: refNum,
          notes,
          postImmediately: pImm,
        },
        req.user?.id
      );

      sendSuccess(res, transaction, 201);
    } catch (err) {
      next(err);
    }
  };

  public getTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const transaction = await this.service.getTransaction(organizationId, id);
      sendSuccess(res, transaction);
    } catch (err) {
      next(err);
    }
  };

  public postTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const transaction = await this.service.postTransaction(organizationId, id, req.user?.id);
      sendSuccess(res, transaction);
    } catch (err) {
      next(err);
    }
  };

  public reverseTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { reason } = req.body;

      if (!reason) throw new ValidationError('Reversal reason is required');

      const transaction = await this.service.reverseTransaction(organizationId, id, reason, req.user?.id);
      sendSuccess(res, transaction);
    } catch (err) {
      next(err);
    }
  };

  public allocateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const {
        transaction_id,
        transactionId,
        obligation_id,
        obligationId,
        allocated_amount,
        allocatedAmount,
        obligation_item_id,
        obligationItemId,
        notes,
      } = req.body;

      const tId = transactionId || transaction_id;
      const oId = obligationId || obligation_id;
      const amount = allocatedAmount !== undefined ? allocatedAmount : allocated_amount;
      const itemKey = obligationItemId || obligation_item_id;

      if (!tId || !oId || amount === undefined) {
        throw new ValidationError('transactionId, obligationId, and allocatedAmount are required');
      }

      const allocation = await this.service.allocateTransaction(
        organizationId,
        tId,
        oId,
        Number(amount),
        itemKey,
        notes,
        req.user?.id
      );

      sendSuccess(res, allocation, 201);
    } catch (err) {
      next(err);
    }
  };

  public listAllocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { obligationId, obligation_id, transactionId, transaction_id } = req.query;

      const oId = (obligationId || obligation_id) as string;
      const tId = (transactionId || transaction_id) as string;

      const allocations = await this.service.listAllocations(organizationId, oId, tId);
      sendSuccess(res, allocations);
    } catch (err) {
      next(err);
    }
  };
}

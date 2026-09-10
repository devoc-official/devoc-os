import { Router, Request, Response } from 'express';
import { getDbClient } from '../database/index.js';
import { sendSuccess, sendError } from '../shared/http/envelope.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'pass', timestamp: new Date().toISOString() }, 200);
});

healthRouter.get('/readiness', async (req: Request, res: Response) => {
  try {
    const db = getDbClient();
    await db.query('SELECT 1;');
    sendSuccess(
      res,
      {
        status: 'pass',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    sendError(res, err as Error, req.requestId);
  }
});

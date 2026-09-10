import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess, sendError } from '../shared/http/envelope.js';
import { ValidationError } from '../shared/errors/index.js';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const result = await AuthService.login(email, password);
      sendSuccess(res, result, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In JWT stateless auth, logout invalidates client token.
      sendSuccess(res, { message: 'Successfully logged out' }, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ValidationError('Authenticated user context missing');
      }

      const memberships = await AuthService.getUserMemberships(req.user.id);
      sendSuccess(
        res,
        {
          user: req.user,
          memberships,
        },
        200
      );
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}

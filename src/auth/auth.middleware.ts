import { Request, Response, NextFunction } from 'express';
import { AuthService, UserIdentity } from './auth.service.js';
import { AuthenticationError } from '../shared/errors/index.js';
import { sendError } from '../shared/http/envelope.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserIdentity;
      requestId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header');
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);
    const user = await AuthService.getUserById(decoded.sub);

    if (!user || !user.isActive) {
      throw new AuthenticationError('User account is inactive or no longer exists');
    }

    req.user = user;
    next();
  } catch (err) {
    sendError(res, err as Error, req.requestId);
  }
};

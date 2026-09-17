import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);

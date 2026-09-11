import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config/index.js';
import { authRouter } from './auth/auth.router.js';
import { organizationRouter } from './modules/organization/api/organization.router.js';
import { peopleRouter } from './modules/people/api/people.router.js';
import { assignmentRouter } from './modules/assignments/api/assignment.router.js';
import { projectsTasksRouter } from './modules/projects-tasks/api/projects-tasks.router.js';
import { workRouter } from './modules/work/api/work.router.js';
import { meetingRouter } from './modules/meetings/api/meeting.router.js';
import { registerProjectTaskTargetResolvers } from './modules/projects-tasks/infrastructure/target-resolver.js';
import { healthRouter } from './api/health.router.js';
import { sendError } from './shared/http/envelope.js';
import { NotFoundError } from './shared/errors/index.js';

export const createApp = (): express.Application => {
  const app = express();

  // Register domain target resolvers
  registerProjectTaskTargetResolvers();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());

  // Request ID / Correlation ID middleware
  app.use((req, _res, next) => {
    req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
    next();
  });

  // Mount V1 API Routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', organizationRouter);
  app.use('/api/v1', peopleRouter);
  app.use('/api/v1', assignmentRouter);
  app.use('/api/v1', projectsTasksRouter);
  app.use('/api/v1', workRouter);
  app.use('/api/v1', meetingRouter);

  // 404 Fallback
  app.use((req, res) => {
    sendError(res, new NotFoundError(`Endpoint '${req.method} ${req.path}' not found`), req.requestId);
  });

  // Global Error Handler
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, err, req.requestId);
  });

  return app;
};

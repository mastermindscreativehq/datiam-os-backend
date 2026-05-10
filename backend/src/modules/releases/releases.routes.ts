import { Router } from 'express';
import * as releasesController from './releases.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import {
  createReleaseSchema,
  updateReleaseSchema,
  createReleaseTaskSchema,
  updateReleaseTaskSchema,
} from './releases.schema';

// Main /api/releases router
export const releasesRouter = Router();

releasesRouter.use(authenticate);

releasesRouter.post('/', validate(createReleaseSchema), releasesController.createRelease);
releasesRouter.get('/', releasesController.getReleases);
releasesRouter.get('/:id', releasesController.getReleaseById);
releasesRouter.patch('/:id', validate(updateReleaseSchema), releasesController.updateRelease);
releasesRouter.post('/:id/tasks', validate(createReleaseTaskSchema), releasesController.createReleaseTask);
releasesRouter.get('/:id/tasks', releasesController.getReleaseTasks);

// Separate /api/release-tasks router for PATCH /api/release-tasks/:id
export const releaseTasksRouter = Router();

releaseTasksRouter.use(authenticate);
releaseTasksRouter.patch('/:id', validate(updateReleaseTaskSchema), releasesController.updateReleaseTask);

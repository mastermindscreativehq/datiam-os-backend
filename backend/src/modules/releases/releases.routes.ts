import { Router } from 'express';
import * as releasesController from './releases.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { requestTimeout } from '../../middleware/requestTimeout';
import { reportSlowRequest } from '../../db/poolHealth';
import {
  createReleaseSchema,
  updateReleaseSchema,
  createReleaseTaskSchema,
  updateReleaseTaskSchema,
  updateChecklistSchema,
} from './releases.schema';

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Main /api/releases router
export const releasesRouter = Router();

// GET reads here are pure DB lookups with no legitimate reason to run long —
// a stricter, separate ceiling than the app-wide 90s lets us both fail fast
// for users and detect pool trouble quickly (see poolHealth.ts).
releasesRouter.use(requestTimeout(20_000, {
  skip: (req) => req.method !== 'GET',
  onTimeout: () => reportSlowRequest('releases'),
}));

releasesRouter.use(authenticate);

releasesRouter.post('/', canWrite, validate(createReleaseSchema), releasesController.createRelease);
releasesRouter.get('/', releasesController.getReleases);
releasesRouter.get('/:id', releasesController.getReleaseById);
releasesRouter.patch('/:id', canWrite, validate(updateReleaseSchema), releasesController.updateRelease);
releasesRouter.delete('/:id', canDelete, releasesController.deleteRelease);
releasesRouter.post('/:id/tasks', canWrite, validate(createReleaseTaskSchema), releasesController.createReleaseTask);
releasesRouter.get('/:id/tasks', releasesController.getReleaseTasks);
releasesRouter.get('/:id/checklist', releasesController.getChecklist);
releasesRouter.patch('/:id/checklist', canWrite, validate(updateChecklistSchema), releasesController.updateChecklist);
releasesRouter.get('/:id/state', releasesController.getReleaseState);

// Separate /api/release-tasks router for PATCH /api/release-tasks/:id
export const releaseTasksRouter = Router();

releaseTasksRouter.use(authenticate);
releaseTasksRouter.patch('/:id', canWrite, validate(updateReleaseTaskSchema), releasesController.updateReleaseTask);

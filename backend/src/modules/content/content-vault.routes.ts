import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createContentSchema,
  updateContentSchema,
  contentSearchSchema,
  createTagSchema,
  createVersionSchema,
} from './content-vault.schema';
import * as ctrl from './content-vault.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Tags (static paths before :id)
router.get('/tags',            ctrl.listTags);
router.post('/tags', canWrite, validate(createTagSchema), ctrl.createTag);

// Content CRUD
router.post('/',    canWrite, validate(createContentSchema),  ctrl.createContent);
router.get('/',    validate(contentSearchSchema, 'query'),    ctrl.searchContent);
router.get('/:id',                                            ctrl.getContent);
router.patch('/:id', canWrite, validate(updateContentSchema), ctrl.updateContent);
router.delete('/:id', canDelete,                              ctrl.deleteContent);

// Versions
router.post('/:id/versions', canWrite, validate(createVersionSchema), ctrl.createVersion);
router.get('/:id/versions',                                            ctrl.getVersions);

// Tag associations
router.get('/:id/tags',                ctrl.getContentTags);
router.post('/:id/tags/:tagId',   canWrite, ctrl.linkTag);
router.delete('/:id/tags/:tagId', canWrite, ctrl.unlinkTag);

export default router;

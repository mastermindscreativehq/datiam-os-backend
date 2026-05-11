import { Router } from 'express';
import * as contentController from './content.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { createContentIdeaSchema, updateContentIdeaSchema } from './content.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

router.post('/', canWrite, validate(createContentIdeaSchema), contentController.createContentIdea);
router.get('/', contentController.getContentIdeas);
router.patch('/:id', canWrite, validate(updateContentIdeaSchema), contentController.updateContentIdea);
router.delete('/:id', canDelete, contentController.deleteContentIdea);

export default router;

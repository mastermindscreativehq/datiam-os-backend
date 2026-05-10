import { Router } from 'express';
import * as contentController from './content.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createContentIdeaSchema, updateContentIdeaSchema } from './content.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createContentIdeaSchema), contentController.createContentIdea);
router.get('/', contentController.getContentIdeas);
router.patch('/:id', validate(updateContentIdeaSchema), contentController.updateContentIdea);

export default router;

import { Router } from 'express';
import { register, login, me, updateMe, changePassword } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { registerSchema, loginSchema, updateMeSchema, changePasswordSchema } from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, updateMe, changePassword } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { registerSchema, loginSchema, updateMeSchema, changePasswordSchema } from './auth.schema';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Too many login attempts. Try again in 15 minutes.' });
  },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;

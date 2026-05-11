import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { hashPassword, comparePassword } from '../../utils/hash';
import { signToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';
import type { RegisterInput, LoginInput, UpdateMeInput, ChangePasswordInput } from './auth.schema';

export const registerUser = async (input: RegisterInput) => {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) throw new AppError('Email already registered', 409);

  const password_hash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      password_hash,
      full_name: input.full_name,
      role: input.role ?? 'team',
    })
    .returning({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      role: users.role,
    });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user, token };
};

export const loginUser = async (input: LoginInput) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  console.log(`[AUTH] login attempt email=${input.email} user_found=${!!user} role=${user?.role ?? 'n/a'}`);

  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await comparePassword(input.password, user.password_hash);
  console.log(`[AUTH] password_match=${valid} user_id=${user.id}`);

  if (!valid) throw new AppError('Invalid credentials', 401);

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    token,
  };
};

export const getMe = async (userId: string) => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      role: users.role,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new AppError('User not found', 404);
  return user;
};

export const updateMe = async (userId: string, input: UpdateMeInput) => {
  if (input.email) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing && existing.id !== userId) {
      throw new AppError('Email already in use', 409);
    }
  }

  const [updated] = await db
    .update(users)
    .set({ ...input, updated_at: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      role: users.role,
      created_at: users.created_at,
    });

  if (!updated) throw new AppError('User not found', 404);
  return updated;
};

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError('User not found', 404);

  const valid = await comparePassword(input.current_password, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  const password_hash = await hashPassword(input.new_password);
  await db
    .update(users)
    .set({ password_hash, updated_at: new Date() })
    .where(eq(users.id, userId));

  return { message: 'Password updated successfully' };
};

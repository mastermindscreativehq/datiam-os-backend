import { eq, and, isNull, ilike, desc, count } from 'drizzle-orm';
import { db } from '../../db';
import { companies, companyTypeEnum, companyTierEnum } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateCompanyInput, UpdateCompanyInput } from './companies.schema';

type CompanyType = typeof companyTypeEnum.enumValues[number];
type CompanyTier = typeof companyTierEnum.enumValues[number];

export interface CompanyListQuery {
  type?:    string;
  tier?:    string;
  country?: string;
  search?:  string;
  page?:    number;
  limit?:   number;
}

export const listCompanies = async (query: CompanyListQuery = {}) => {
  const { type, tier, country, search, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const conditions = [isNull(companies.deleted_at)] as ReturnType<typeof eq>[];
  if (type)    conditions.push(eq(companies.type,    type as CompanyType));
  if (tier)    conditions.push(eq(companies.tier,    tier as CompanyTier));
  if (country) conditions.push(eq(companies.country, country));
  if (search)  conditions.push(ilike(companies.name, `%${search}%`));

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(companies).where(where).orderBy(desc(companies.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(companies).where(where),
  ]);

  return { data: rows, total: Number(total), page, limit };
};

export const getCompanyById = async (id: string) => {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), isNull(companies.deleted_at)));
  if (!company) throw new AppError('Company not found', 404);
  return company;
};

export const createCompany = async (input: CreateCompanyInput) => {
  const [company] = await db
    .insert(companies)
    .values({
      ...input,
      avg_license_fee_usd: input.avg_license_fee_usd?.toString(),
    })
    .returning();
  return company;
};

export const updateCompany = async (id: string, input: UpdateCompanyInput) => {
  const [updated] = await db
    .update(companies)
    .set({
      ...input,
      avg_license_fee_usd: input.avg_license_fee_usd?.toString(),
      updated_at: new Date(),
    })
    .where(and(eq(companies.id, id), isNull(companies.deleted_at)))
    .returning();
  if (!updated) throw new AppError('Company not found', 404);
  return updated;
};

export const softDeleteCompany = async (id: string) => {
  const [deleted] = await db
    .update(companies)
    .set({ deleted_at: new Date() })
    .where(and(eq(companies.id, id), isNull(companies.deleted_at)))
    .returning({ id: companies.id });
  if (!deleted) throw new AppError('Company not found', 404);
  return { id: deleted.id, deleted: true as const };
};

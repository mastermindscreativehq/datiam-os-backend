import { Request, Response, NextFunction } from 'express';
import * as service from './companies.service';
import { success, paginated } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, tier, country, search, page, limit } = req.query as Record<string, string>;
    const result = await service.listCompanies({
      type,
      tier,
      country,
      search,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await service.getCompanyById(req.params.id);
    success(res, company);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await service.createCompany(req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'company_created',
      module:     'companies',
      entityType: 'company',
      entityId:   company.id,
      title:      `Company created: ${company.name}`,
    });
    success(res, company, 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await service.updateCompany(req.params.id, req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'company_updated',
      module:     'companies',
      entityType: 'company',
      entityId:   company.id,
      title:      `Company updated: ${company.name}`,
    });
    success(res, company);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.softDeleteCompany(req.params.id);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'company_deleted',
      module:     'companies',
      entityType: 'company',
      entityId:   result.id,
      title:      `Company deleted: ${result.id}`,
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
};

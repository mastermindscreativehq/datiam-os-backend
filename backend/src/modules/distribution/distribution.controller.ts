import { Request, Response, NextFunction } from 'express';
import * as distributionService from './distribution.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createIdentifier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const identifier = await distributionService.createIdentifier(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'distribution_identifier.created',
      module: 'distribution',
      entityType: 'distribution_identifier',
      entityId: identifier.id,
      title: `${identifier.identifier_type.toUpperCase()} assigned`,
      description: `Assigned ${identifier.identifier_type} ${identifier.value}`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { identifierId: identifier.id, type: identifier.identifier_type },
    });
    success(res, identifier, 201);
  } catch (err) { next(err); }
};

export const getIdentifiersBySong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getIdentifiersBySong(req.params.songId)); }
  catch (err) { next(err); }
};

export const getIdentifiersByRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getIdentifiersByRelease(req.params.releaseId)); }
  catch (err) { next(err); }
};

export const deleteIdentifier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.deleteIdentifier(req.params.id)); }
  catch (err) { next(err); }
};

export const createDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const delivery = await distributionService.createDelivery(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'distribution_delivery.created',
      module: 'distribution',
      entityType: 'distribution_delivery',
      entityId: delivery.id,
      title: `Delivery queued: ${delivery.dsp}`,
      description: `Queued release ${delivery.release_id} for delivery to ${delivery.dsp}`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { deliveryId: delivery.id, releaseId: delivery.release_id, dsp: delivery.dsp },
    });
    success(res, delivery, 201);
  } catch (err) { next(err); }
};

export const getDeliveriesByRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getDeliveriesByRelease(req.params.releaseId)); }
  catch (err) { next(err); }
};

export const getDeliveryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getDeliveryById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateDeliveryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await distributionService.updateDeliveryStatus(req.params.id, req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'distribution_delivery.status_changed',
      module: 'distribution',
      entityType: 'distribution_delivery',
      entityId: updated.id,
      title: `Delivery ${updated.status}`,
      description: `Delivery ${updated.id} to ${updated.dsp} is now ${updated.status}`,
      severity: updated.status === 'failed' ? 'warning' : 'info',
      requestId: req.requestId,
      metadata: { deliveryId: updated.id, status: updated.status },
    });
    success(res, updated);
  } catch (err) { next(err); }
};

export const addTerritory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.addTerritory(req.body), 201); }
  catch (err) { next(err); }
};

export const getTerritoriesByDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getTerritoriesByDelivery(req.params.deliveryId)); }
  catch (err) { next(err); }
};

export const updateTerritoryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.updateTerritoryStatus(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const requestTakedown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const takedown = await distributionService.requestTakedown(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'distribution_takedown.requested',
      module: 'distribution',
      entityType: 'distribution_takedown',
      entityId: takedown.id,
      title: 'Takedown requested',
      description: `Takedown requested for delivery ${takedown.delivery_id}`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { takedownId: takedown.id, deliveryId: takedown.delivery_id },
    });
    success(res, takedown, 201);
  } catch (err) { next(err); }
};

export const getTakedownsByDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getTakedownsByDelivery(req.params.deliveryId)); }
  catch (err) { next(err); }
};

export const updateTakedownStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.updateTakedownStatus(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const upsertHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.upsertHealth(req.body)); }
  catch (err) { next(err); }
};

export const getHealthByRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getHealthByRelease(req.params.releaseId)); }
  catch (err) { next(err); }
};

export const logDeliveryEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.logDeliveryEvent(req.body), 201); }
  catch (err) { next(err); }
};

export const getLogsByDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await distributionService.getLogsByDelivery(req.params.deliveryId)); }
  catch (err) { next(err); }
};

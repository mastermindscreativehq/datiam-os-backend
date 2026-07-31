import { Router } from 'express';
import * as distributionController from './distribution.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createIdentifierSchema,
  createDeliverySchema,
  updateDeliveryStatusSchema,
  addTerritorySchema,
  updateTerritoryStatusSchema,
  requestTakedownSchema,
  updateTakedownStatusSchema,
  upsertHealthSchema,
  logDeliveryEventSchema,
} from './distribution.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// identifiers
router.post('/identifiers', canWrite, validate(createIdentifierSchema), distributionController.createIdentifier);
router.get('/song/:songId/identifiers', distributionController.getIdentifiersBySong);
router.get('/release/:releaseId/identifiers', distributionController.getIdentifiersByRelease);
router.delete('/identifiers/:id', canDelete, distributionController.deleteIdentifier);

// deliveries
router.post('/deliveries', canWrite, validate(createDeliverySchema), distributionController.createDelivery);
router.get('/release/:releaseId/deliveries', distributionController.getDeliveriesByRelease);
router.get('/deliveries/:id', distributionController.getDeliveryById);
router.patch('/deliveries/:id/status', canWrite, validate(updateDeliveryStatusSchema), distributionController.updateDeliveryStatus);

// territories
router.post('/territories', canWrite, validate(addTerritorySchema), distributionController.addTerritory);
router.get('/deliveries/:deliveryId/territories', distributionController.getTerritoriesByDelivery);
router.patch('/territories/:id/status', canWrite, validate(updateTerritoryStatusSchema), distributionController.updateTerritoryStatus);

// takedowns
router.post('/takedowns', canWrite, validate(requestTakedownSchema), distributionController.requestTakedown);
router.get('/deliveries/:deliveryId/takedowns', distributionController.getTakedownsByDelivery);
router.patch('/takedowns/:id/status', canWrite, validate(updateTakedownStatusSchema), distributionController.updateTakedownStatus);

// health
router.put('/health', canWrite, validate(upsertHealthSchema), distributionController.upsertHealth);
router.get('/release/:releaseId/health', distributionController.getHealthByRelease);

// delivery logs
router.post('/logs', canWrite, validate(logDeliveryEventSchema), distributionController.logDeliveryEvent);
router.get('/deliveries/:deliveryId/logs', distributionController.getLogsByDelivery);

export default router;

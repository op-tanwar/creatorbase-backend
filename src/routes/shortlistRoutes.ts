import { Router } from 'express';
import { ShortlistController } from '../controllers/shortlistController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createShortlistSchema,
  addCreatorToShortlistSchema,
  updateShortlistItemSchema,
  updateDeliverableStageSchema,
} from '../validators/shortlistSchemas';

const router = Router();

router.use(requireAuth);

router.get('/', ShortlistController.getShortlists);
router.get('/:id', ShortlistController.getShortlistById);
router.get('/:shortlistId/kanban', ShortlistController.getKanban);
router.get('/:id/kanban', ShortlistController.getKanban);

router.post('/', validateBody(createShortlistSchema), ShortlistController.createShortlist);
router.post('/:id/creators', validateBody(addCreatorToShortlistSchema), ShortlistController.addCreator);

// Deliverable Stage Transitions (both :shortlistId/items/:creatorId/stage and :id/creators/:creatorId/stage)
router.patch(
  '/:shortlistId/items/:creatorId/stage',
  validateBody(updateDeliverableStageSchema),
  ShortlistController.updateStage
);
router.patch(
  '/:id/creators/:creatorId/stage',
  validateBody(updateDeliverableStageSchema),
  ShortlistController.updateStage
);

router.patch('/:id/creators/:creatorId', validateBody(updateShortlistItemSchema), ShortlistController.updateCreator);
router.delete('/:id/creators/:creatorId', ShortlistController.removeCreator);
router.get('/:id/export-csv', ShortlistController.exportCsv);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/adminAuth';
import { AdminController } from '../controllers/adminController';

const router = Router();

// Protect all admin endpoints with requireAuth and requireSuperAdmin
router.use(requireAuth, requireSuperAdmin);

// Overview & Analytics
router.get('/metrics', AdminController.getMetrics);

// Agency / User Management
router.get('/agencies', AdminController.getAgencies);
router.patch('/agencies/:id', AdminController.updateAgency);

// Revenue & Transactions Ledger
router.get('/transactions', AdminController.getTransactions);

// Creator Catalog Management (CRUD)
router.post('/creators', AdminController.createCreator);
router.post('/creators/bulk-apify-sync', AdminController.bulkApifySync);
router.patch('/creators/:id', AdminController.updateCreator);
router.delete('/creators/:id', AdminController.deleteCreator);

export default router;

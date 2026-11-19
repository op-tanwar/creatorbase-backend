import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', InvoiceController.createInvoice);
router.get('/', InvoiceController.getInvoices);
router.get('/:id', InvoiceController.getInvoiceById);
router.get('/:id/html', InvoiceController.getInvoiceHtml);

export default router;

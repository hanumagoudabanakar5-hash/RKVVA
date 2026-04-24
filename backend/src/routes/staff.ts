import { Router } from 'express';
import { getStaff, addStaff, deleteStaff, getStats } from '../controllers/staffController';

const router = Router();

router.get('/stats', getStats);   // must come before /:id
router.get('/', getStaff);
router.post('/', addStaff);
router.delete('/:id', deleteStaff);

export default router;

import { Router } from 'express';
import { submitProgress, getWeakAreas } from '../controllers/progressController';

const router = Router();

router.post('/submit', submitProgress);
router.get('/weak-areas/:restaurant_id', getWeakAreas);

export default router;

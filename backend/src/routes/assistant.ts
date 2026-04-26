import { Router } from 'express';
import { askAssistant, getChatHistory } from '../controllers/assistantController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/ask', authMiddleware, askAssistant);
router.get('/history', authMiddleware, getChatHistory);

export default router;

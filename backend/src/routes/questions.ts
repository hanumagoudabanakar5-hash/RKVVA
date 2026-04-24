import { Router } from 'express';
import { 
  generateQuestions, 
  getQuestions, 
  getApprovedQuestions,
  getLessonQuestions,
  approveQuestion, 
  updateQuestion, 
  deleteQuestion 
} from '../controllers/questionController';

const router = Router();

router.post('/generate', generateQuestions);
router.get('/lesson', getLessonQuestions);
router.get('/', getQuestions);
router.get('/approved', getApprovedQuestions);
router.post('/approve/:id', approveQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;

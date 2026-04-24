import { Router } from 'express';
import multer from 'multer';
import { uploadFile, getFiles } from '../controllers/fileController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);

export default router;

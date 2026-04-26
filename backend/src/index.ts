import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import questionRoutes from './routes/questions';
import staffRoutes from './routes/staff';
import progressRoutes from './routes/progress';
import assistantRoutes from './routes/assistant';
import { authMiddleware } from './middleware/authMiddleware';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/questions', authMiddleware, questionRoutes);
app.use('/api/staff', authMiddleware, staffRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);
app.use('/api/assistant', assistantRoutes);

// Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('Nexinbe Backend API is running');
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

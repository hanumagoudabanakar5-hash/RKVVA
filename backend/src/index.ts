import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import questionRoutes from './routes/questions';
import staffRoutes from './routes/staff';
import progressRoutes from './routes/progress';
import { authMiddleware } from './middleware/authMiddleware';

// Public routes
app.use('/api/auth', authRoutes); // Login/Signup handled by Supabase, but we can keep the route for now if needed

// Protected routes
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/questions', authMiddleware, questionRoutes);
app.use('/api/staff', authMiddleware, staffRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);



// Initialize Supabase Client
// const supabaseUrl = process.env.SUPABASE_URL || '';
// const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseKey);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Nexinbe Backend API is running');
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

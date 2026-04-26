import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: string;
    restaurant_id: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the custom JWT signed by authController
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user data to request from the JWT payload
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      restaurant_id: decoded.restaurant_id
    };

    next();
  } catch (err: any) {
    // If the token is old/Supabase format, jwt.verify will throw 'invalid algorithm' or similar
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session has expired or is invalid. Please log out and log in again.' });
    }
    console.error('Auth middleware critical error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

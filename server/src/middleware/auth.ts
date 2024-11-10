import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  flag: boolean;
  user?: {
    userId: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    req.user = undefined; // Ensure req.user is undefined for non-logged in users
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as { userId: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    req.user = undefined; // Ensure req.user is undefined if token is invalid
    next();
  }
};


export const isAdminOrEditor = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied' });
  }
};
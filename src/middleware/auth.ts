import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // BUG-010 FIX: Import crypto at top instead of using require()
import { AppError } from './errorHandler';
import { config } from '../config';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  apiKey?: string;
}

export const verifyApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    // TODO: Validate API key from database
    req.apiKey = apiKey;
    next();
  } catch (error) {
    next(error);
  }
};

export const verifyWebhookSignature = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-webhook-signature'] as string;
      
      if (!signature) {
        throw new AppError('Webhook signature is required', 401);
      }

      // TODO: Implement signature verification based on provider
      // For now, basic HMAC verification
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new AppError('Invalid webhook signature', 401);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, config.security.jwtSecret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

// BUG-007 FIX: Add try-catch to properly handle errors in async middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !roles.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
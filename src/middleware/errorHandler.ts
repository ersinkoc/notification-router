import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }

  const error = err as AppError;
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  logger.error({
    error: {
      message,
      statusCode,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    },
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: error.isOperational ? message : 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
  });
};
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../src/middleware/auth';
import { AppError } from '../../src/middleware/errorHandler';

describe('BUG-007: requireRole Middleware Error Handling Fix', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = jest.fn();
  });

  test('should call next with error when user is not authenticated', () => {
    const middleware = requireRole(['admin']);
    middleware(mockRequest as any, mockResponse as any, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(1);
    const error = nextFunction.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
  });

  test('should call next without error when user has required role', () => {
    mockRequest = {
      user: {
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
      },
    } as any;

    const middleware = requireRole(['admin']);
    middleware(mockRequest as any, mockResponse as any, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });
});

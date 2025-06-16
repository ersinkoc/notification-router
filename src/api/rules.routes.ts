import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import * as rulesService from '../services/rulesService';

const router = Router();

// GET /api/v1/rules
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const rules = await rulesService.getAllRules();
    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/rules/:id
router.get('/:id', authenticateJWT, async (req, res, next) => {
  try {
    const rule = await rulesService.getRuleById(req.params.id);
    
    if (!rule) {
      throw new AppError('Rule not found', 404);
    }
    
    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/rules
router.post('/',
  authenticateJWT,
  requireRole(['admin']),
  body('name').isString().notEmpty(),
  body('conditions').isObject(),
  body('channels').isArray().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation error', 400);
      }

      const rule = await rulesService.createRule(req.body);
      
      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/rules/:id
router.put('/:id',
  authenticateJWT,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const rule = await rulesService.updateRule(req.params.id, req.body);
      
      if (!rule) {
        throw new AppError('Rule not found', 404);
      }
      
      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/rules/:id
router.delete('/:id',
  authenticateJWT,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const success = await rulesService.deleteRule(req.params.id);
      
      if (!success) {
        throw new AppError('Rule not found', 404);
      }
      
      res.json({
        success: true,
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export const rulesRouter = router;
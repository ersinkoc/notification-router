import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { channelManager } from '../channels/channelManager';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/v1/channels/types
router.get('/types', authenticateJWT, (req, res) => {
  const channels = channelManager.getAvailableChannels();
  
  res.json({
    success: true,
    data: channels.map(type => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      enabled: true,
    })),
  });
});

// POST /api/v1/channels/validate
router.post('/validate', authenticateJWT, async (req, res, next) => {
  try {
    const { type, config } = req.body;
    
    if (!type || !config) {
      throw new AppError('Type and config are required', 400);
    }
    
    const isValid = await channelManager.validateChannelConfig(type, config);
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        type,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/channels/test
router.post('/test', authenticateJWT, async (req, res, next) => {
  try {
    const { type, config, message } = req.body;
    
    if (!type || !config || !message) {
      throw new AppError('Type, config, and message are required', 400);
    }
    
    const adapter = channelManager.getAdapter(type);
    if (!adapter) {
      throw new AppError(`Channel type ${type} not found`, 404);
    }
    
    const result = await adapter.send(message, config);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export const channelsRouter = router;
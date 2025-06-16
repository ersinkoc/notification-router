import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { ChannelAdapter, MessageContent, DeliveryResult, ChannelType } from '../../types';
import { logger } from '../../utils/logger';

export class WebhookAdapter implements ChannelAdapter {
  type: ChannelType = 'webhook';

  async send(message: MessageContent, channelConfig: Record<string, any>): Promise<DeliveryResult> {
    try {
      const { 
        url, 
        method = 'POST', 
        headers = {}, 
        auth,
        signatureKey,
        timeout = 30000,
        retryOnFailure = false,
      } = channelConfig;

      if (!url) {
        throw new Error('Missing webhook URL');
      }

      const payload = this.buildPayload(message, channelConfig);
      const requestConfig: AxiosRequestConfig = {
        method,
        url,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout,
      };

      // Add authentication
      if (auth) {
        if (auth.type === 'bearer') {
          requestConfig.headers!['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.type === 'basic') {
          requestConfig.auth = {
            username: auth.username,
            password: auth.password,
          };
        } else if (auth.type === 'apikey') {
          requestConfig.headers![auth.header || 'X-API-Key'] = auth.key;
        }
      }

      // Add signature if configured
      if (signatureKey) {
        const signature = this.generateSignature(payload, signatureKey);
        requestConfig.headers!['X-Webhook-Signature'] = signature;
      }

      const response = await axios(requestConfig);

      return {
        success: response.status >= 200 && response.status < 300,
        provider: 'webhook',
        timestamp: new Date(),
        details: {
          status: response.status,
          statusText: response.statusText,
          responseData: response.data,
        },
      };
    } catch (error) {
      logger.error('Webhook delivery failed:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          timestamp: new Date(),
          error: error.message,
          details: {
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data,
          },
        };
      }
      
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildPayload(message: MessageContent, config: Record<string, any>): any {
    const { payloadTemplate, includeMetadata = true } = config;

    // Use custom template if provided
    if (payloadTemplate) {
      try {
        // Simple template replacement
        let template = JSON.stringify(payloadTemplate);
        template = template.replace(/\{\{title\}\}/g, message.title || '');
        template = template.replace(/\{\{body\}\}/g, message.body);
        template = template.replace(/\{\{data\}\}/g, JSON.stringify(message.data));
        return JSON.parse(template);
      } catch (error) {
        logger.error('Failed to parse payload template:', error);
      }
    }

    // Default payload structure
    const payload: any = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data,
      timestamp: new Date().toISOString(),
    };

    if (includeMetadata) {
      payload.attachments = message.attachments;
      payload.actions = message.actions;
    }

    return payload;
  }

  private generateSignature(payload: any, secret: string): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  async validate(channelConfig: Record<string, any>): Promise<boolean> {
    const { url } = channelConfig;
    
    if (!url) return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
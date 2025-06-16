import twilio from 'twilio';
import { ChannelAdapter, MessageContent, DeliveryResult, ChannelType } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class SmsAdapter implements ChannelAdapter {
  type: ChannelType = 'sms';
  private twilioClient?: twilio.Twilio;

  constructor() {
    if (config.channels.sms.twilio.accountSid && config.channels.sms.twilio.authToken) {
      this.twilioClient = twilio(
        config.channels.sms.twilio.accountSid,
        config.channels.sms.twilio.authToken,
      );
    }
  }

  async send(message: MessageContent, channelConfig: Record<string, any>): Promise<DeliveryResult> {
    try {
      const { to, from, provider = 'twilio' } = channelConfig;

      if (!to) {
        throw new Error('Missing required SMS configuration: to');
      }

      const fromNumber = from || config.channels.sms.twilio.fromNumber;
      if (!fromNumber) {
        throw new Error('Missing SMS from number');
      }

      const smsBody = this.formatSmsMessage(message);

      if (provider === 'twilio') {
        return await this.sendViaTwilio(to, fromNumber, smsBody);
      } else {
        throw new Error(`Unsupported SMS provider: ${provider}`);
      }
    } catch (error) {
      logger.error('SMS delivery failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendViaTwilio(
    to: string,
    from: string,
    body: string,
  ): Promise<DeliveryResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const message = await this.twilioClient.messages.create({
      body,
      from,
      to,
    });

    return {
      success: message.status !== 'failed',
      messageId: message.sid,
      provider: 'twilio',
      timestamp: new Date(),
      details: {
        status: message.status,
        price: message.price,
        priceUnit: message.priceUnit,
      },
    };
  }

  private formatSmsMessage(message: MessageContent): string {
    let smsBody = '';
    
    if (message.title) {
      smsBody += `${message.title}\n\n`;
    }
    
    smsBody += message.body;
    
    // Add first action URL if available
    if (message.actions && message.actions.length > 0) {
      const firstAction = message.actions.find(a => a.url);
      if (firstAction) {
        smsBody += `\n\n${firstAction.text}: ${firstAction.url}`;
      }
    }
    
    // Truncate to SMS length limit (160 chars for standard, 1600 for extended)
    const maxLength = 1600;
    if (smsBody.length > maxLength) {
      smsBody = smsBody.substring(0, maxLength - 3) + '...';
    }
    
    return smsBody;
  }

  async validate(channelConfig: Record<string, any>): Promise<boolean> {
    const { to, provider = 'twilio' } = channelConfig;
    
    if (!to) return false;
    
    if (provider === 'twilio') {
      return !!this.twilioClient;
    }
    
    return false;
  }
}
import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { ChannelAdapter, MessageContent, DeliveryResult, ChannelType } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class SlackAdapter implements ChannelAdapter {
  type: ChannelType = 'slack';
  private client?: WebClient;

  constructor() {
    if (config.channels.slack.botToken) {
      this.client = new WebClient(config.channels.slack.botToken);
    }
  }

  async send(message: MessageContent, channelConfig: Record<string, any>): Promise<DeliveryResult> {
    try {
      const { channel, webhookUrl, method = 'webhook' } = channelConfig;

      if (method === 'webhook' && webhookUrl) {
        return await this.sendViaWebhook(message, webhookUrl);
      } else if (method === 'api' && channel) {
        return await this.sendViaAPI(message, channel);
      } else {
        throw new Error('Invalid Slack configuration: specify either webhookUrl or channel');
      }
    } catch (error) {
      logger.error('Slack delivery failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendViaWebhook(
    message: MessageContent,
    webhookUrl: string,
  ): Promise<DeliveryResult> {
    const payload = this.formatSlackMessage(message);
    
    const response = await axios.post(webhookUrl, payload);

    return {
      success: response.status === 200,
      provider: 'slack-webhook',
      timestamp: new Date(),
      details: { status: response.status },
    };
  }

  private async sendViaAPI(
    message: MessageContent,
    channel: string,
  ): Promise<DeliveryResult> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    const blocks = this.formatSlackBlocks(message);
    
    const result = await this.client.chat.postMessage({
      channel,
      text: message.body,
      blocks,
    });

    return {
      success: result.ok || false,
      messageId: result.ts,
      provider: 'slack-api',
      timestamp: new Date(),
      details: { channel: result.channel },
    };
  }

  private formatSlackMessage(message: MessageContent): any {
    const payload: any = {
      text: message.body,
    };

    if (message.title) {
      payload.text = `*${message.title}*\n${message.body}`;
    }

    payload.blocks = this.formatSlackBlocks(message);

    return payload;
  }

  private formatSlackBlocks(message: MessageContent): any[] {
    const blocks: any[] = [];

    if (message.title) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.title,
        },
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.body,
      },
    });

    if (message.actions && message.actions.length > 0) {
      const elements = message.actions
        .filter(action => action.type === 'button' && action.url)
        .map(action => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.text,
          },
          url: action.url,
          style: action.style === 'danger' ? 'danger' : 'primary',
        }));

      if (elements.length > 0) {
        blocks.push({
          type: 'actions',
          elements,
        });
      }
    }

    if (message.attachments && message.attachments.length > 0) {
      message.attachments
        .filter(att => att.type === 'image')
        .forEach(att => {
          blocks.push({
            type: 'image',
            image_url: att.url,
            alt_text: att.name || 'Image',
          });
        });
    }

    return blocks;
  }

  async validate(channelConfig: Record<string, any>): Promise<boolean> {
    const { channel, webhookUrl, method = 'webhook' } = channelConfig;
    
    if (method === 'webhook') {
      return !!webhookUrl;
    } else if (method === 'api') {
      return !!channel && !!this.client;
    }
    
    return false;
  }
}
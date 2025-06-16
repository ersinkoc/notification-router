import TelegramBot from 'node-telegram-bot-api';
import { ChannelAdapter, MessageContent, DeliveryResult, ChannelType } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class TelegramAdapter implements ChannelAdapter {
  type: ChannelType = 'telegram';
  private bot?: TelegramBot;

  constructor() {
    if (config.channels.telegram.botToken) {
      this.bot = new TelegramBot(config.channels.telegram.botToken, { polling: false });
    }
  }

  async send(message: MessageContent, channelConfig: Record<string, any>): Promise<DeliveryResult> {
    try {
      const { chatId } = channelConfig;

      if (!chatId) {
        throw new Error('Missing required Telegram configuration: chatId');
      }

      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }

      const text = this.formatTelegramMessage(message);
      const options = this.buildMessageOptions(message);

      const result = await this.bot.sendMessage(chatId, text, options);

      return {
        success: true,
        messageId: result.message_id.toString(),
        provider: 'telegram',
        timestamp: new Date(),
        details: {
          chatId: result.chat.id,
          date: result.date,
        },
      };
    } catch (error) {
      logger.error('Telegram delivery failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatTelegramMessage(message: MessageContent): string {
    let text = '';
    
    if (message.title) {
      text += `*${this.escapeMarkdown(message.title)}*\n\n`;
    }
    
    text += this.escapeMarkdown(message.body);
    
    return text;
  }

  private buildMessageOptions(message: MessageContent): any {
    const options: any = {
      parse_mode: 'Markdown',
    };

    if (message.actions && message.actions.length > 0) {
      const keyboard = message.actions
        .filter(action => action.type === 'button')
        .map(action => {
          if (action.url) {
            return [{
              text: action.text,
              url: action.url,
            }];
          }
          return [{
            text: action.text,
            callback_data: action.action || action.text,
          }];
        });

      if (keyboard.length > 0) {
        options.reply_markup = {
          inline_keyboard: keyboard,
        };
      }
    }

    return options;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#\+\-=|{}.!])/g, '\\$1');
  }

  async validate(channelConfig: Record<string, any>): Promise<boolean> {
    return !!channelConfig.chatId && !!this.bot;
  }
}
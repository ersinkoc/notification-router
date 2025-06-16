import { ChannelAdapter, ChannelType } from '../types';
import { EmailAdapter } from './adapters/emailAdapter';
import { SlackAdapter } from './adapters/slackAdapter';
import { SmsAdapter } from './adapters/smsAdapter';
import { TelegramAdapter } from './adapters/telegramAdapter';
import { DiscordAdapter } from './adapters/discordAdapter';
import { WebhookAdapter } from './adapters/webhookAdapter';
import { logger } from '../utils/logger';

class ChannelManager {
  private adapters: Map<ChannelType, ChannelAdapter> = new Map();

  constructor() {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters() {
    this.registerAdapter(new EmailAdapter());
    this.registerAdapter(new SlackAdapter());
    this.registerAdapter(new SmsAdapter());
    this.registerAdapter(new TelegramAdapter());
    this.registerAdapter(new DiscordAdapter());
    this.registerAdapter(new WebhookAdapter());
  }

  registerAdapter(adapter: ChannelAdapter) {
    this.adapters.set(adapter.type, adapter);
    logger.info(`Registered channel adapter: ${adapter.type}`);
  }

  getAdapter(type: ChannelType): ChannelAdapter | undefined {
    return this.adapters.get(type);
  }

  getAvailableChannels(): ChannelType[] {
    return Array.from(this.adapters.keys());
  }

  async validateChannelConfig(type: ChannelType, config: Record<string, any>): Promise<boolean> {
    const adapter = this.getAdapter(type);
    if (!adapter) {
      throw new Error(`No adapter found for channel type: ${type}`);
    }
    return adapter.validate(config);
  }
}

export const channelManager = new ChannelManager();
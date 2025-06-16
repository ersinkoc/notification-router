import axios from 'axios';
import { ChannelAdapter, MessageContent, DeliveryResult, ChannelType } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class DiscordAdapter implements ChannelAdapter {
  type: ChannelType = 'discord';

  async send(message: MessageContent, channelConfig: Record<string, any>): Promise<DeliveryResult> {
    try {
      const webhookUrl = channelConfig.webhookUrl || config.channels.discord.webhookUrl;

      if (!webhookUrl) {
        throw new Error('Missing Discord webhook URL');
      }

      const payload = this.formatDiscordMessage(message);
      
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          wait: true, // Wait for the message to be sent
        },
      });

      return {
        success: response.status === 200,
        messageId: response.data?.id,
        provider: 'discord',
        timestamp: new Date(),
        details: {
          channelId: response.data?.channel_id,
          guildId: response.data?.guild_id,
        },
      };
    } catch (error) {
      logger.error('Discord delivery failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatDiscordMessage(message: MessageContent): any {
    const payload: any = {
      content: message.body,
      embeds: [],
    };

    if (message.title) {
      payload.embeds.push({
        title: message.title,
        description: message.body,
        color: 0x0099ff, // Blue color
        timestamp: new Date().toISOString(),
      });
      payload.content = null; // Use embed instead of content
    }

    // Add fields from data if available
    if (message.data && Object.keys(message.data).length > 0) {
      const embed = payload.embeds[0] || { fields: [] };
      embed.fields = Object.entries(message.data)
        .slice(0, 25) // Discord limit
        .map(([name, value]) => ({
          name: name.substring(0, 256),
          value: String(value).substring(0, 1024),
          inline: true,
        }));
      
      if (payload.embeds.length === 0) {
        payload.embeds.push(embed);
      }
    }

    // Add attachments
    if (message.attachments && message.attachments.length > 0) {
      const imageAttachment = message.attachments.find(att => att.type === 'image');
      if (imageAttachment && payload.embeds.length > 0) {
        payload.embeds[0].image = { url: imageAttachment.url };
      }
    }

    // Add buttons as components
    if (message.actions && message.actions.length > 0) {
      const components = [{
        type: 1, // Action row
        components: message.actions
          .filter(action => action.type === 'button' && action.url)
          .slice(0, 5) // Discord limit
          .map(action => ({
            type: 2, // Button
            style: 5, // Link button
            label: action.text,
            url: action.url,
          })),
      }];

      if (components[0].components.length > 0) {
        payload.components = components;
      }
    }

    return payload;
  }

  async validate(channelConfig: Record<string, any>): Promise<boolean> {
    return !!channelConfig.webhookUrl || !!config.channels.discord.webhookUrl;
  }
}
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { ChannelAdapter, MessageContent, DeliveryResult, ChannelType } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class EmailAdapter implements ChannelAdapter {
  type: ChannelType = 'email';
  private transporter?: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (config.channels.email.smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: config.channels.email.smtp.host,
        port: config.channels.email.smtp.port,
        secure: config.channels.email.smtp.secure,
        auth: {
          user: config.channels.email.smtp.auth.user,
          pass: config.channels.email.smtp.auth.pass,
        },
      });
    }

    if (config.channels.email.sendgrid.apiKey) {
      sgMail.setApiKey(config.channels.email.sendgrid.apiKey);
    }
  }

  async send(message: MessageContent, channelConfig: Record<string, any>): Promise<DeliveryResult> {
    try {
      const { to, from, subject, provider = 'smtp' } = channelConfig;

      if (!to || !from) {
        throw new Error('Missing required email configuration: to, from');
      }

      const emailSubject = subject || message.title || 'Notification';
      const html = this.formatHtml(message);
      const text = this.formatText(message);

      if (provider === 'sendgrid' && config.channels.email.sendgrid.apiKey) {
        return await this.sendViaSendGrid(to, from, emailSubject, html, text);
      } else {
        return await this.sendViaSMTP(to, from, emailSubject, html, text);
      }
    } catch (error) {
      logger.error('Email delivery failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendViaSMTP(
    to: string,
    from: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<DeliveryResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not configured');
    }

    const info = await this.transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp',
      timestamp: new Date(),
      details: { response: info.response },
    };
  }

  private async sendViaSendGrid(
    to: string,
    from: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<DeliveryResult> {
    const msg = {
      to,
      from,
      subject,
      text,
      html,
    };

    const [response] = await sgMail.send(msg);

    return {
      success: true,
      messageId: response.headers['x-message-id'],
      provider: 'sendgrid',
      timestamp: new Date(),
      details: { statusCode: response.statusCode },
    };
  }

  private formatHtml(message: MessageContent): string {
    let html = `<div style="font-family: Arial, sans-serif;">`;
    
    if (message.title) {
      html += `<h2>${message.title}</h2>`;
    }
    
    html += `<div>${message.body.replace(/\n/g, '<br>')}</div>`;
    
    if (message.actions && message.actions.length > 0) {
      html += `<div style="margin-top: 20px;">`;
      message.actions.forEach(action => {
        if (action.type === 'button' && action.url) {
          html += `<a href="${action.url}" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">${action.text}</a>`;
        }
      });
      html += `</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  private formatText(message: MessageContent): string {
    let text = '';
    
    if (message.title) {
      text += `${message.title}\n\n`;
    }
    
    text += message.body;
    
    if (message.actions && message.actions.length > 0) {
      text += '\n\n';
      message.actions.forEach(action => {
        if (action.url) {
          text += `${action.text}: ${action.url}\n`;
        }
      });
    }
    
    return text;
  }

  async validate(channelConfig: Record<string, any>): Promise<boolean> {
    const required = ['to', 'from'];
    return required.every(field => field in channelConfig);
  }
}
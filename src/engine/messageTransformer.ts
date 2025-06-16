import Handlebars from 'handlebars';
import { TransformRule, MessageContent } from '../types';
import { logger } from '../utils/logger';

// Register common Handlebars helpers
Handlebars.registerHelper('json', (context) => JSON.stringify(context, null, 2));
Handlebars.registerHelper('uppercase', (str) => str?.toUpperCase());
Handlebars.registerHelper('lowercase', (str) => str?.toLowerCase());
Handlebars.registerHelper('truncate', (str, length) => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + '...';
});
Handlebars.registerHelper('formatDate', (date, format) => {
  // Simple date formatting
  const d = new Date(date);
  if (format === 'iso') return d.toISOString();
  if (format === 'date') return d.toLocaleDateString();
  if (format === 'time') return d.toLocaleTimeString();
  return d.toLocaleString();
});

export async function transformMessage(
  data: Record<string, any>,
  rule: TransformRule,
): Promise<MessageContent> {
  try {
    // Register custom helpers if provided
    if (rule.helpers) {
      Object.entries(rule.helpers).forEach(([name, func]) => {
        try {
          // Safely create helper function
          const helperFunc = new Function('return ' + func)();
          Handlebars.registerHelper(name, helperFunc);
        } catch (error) {
          logger.error(`Failed to register helper ${name}:`, error);
        }
      });
    }

    // Parse template
    const template = Handlebars.compile(rule.template);
    const transformed = template(data);

    // Try to parse as JSON first (for structured templates)
    try {
      const parsed = JSON.parse(transformed);
      return {
        title: parsed.title,
        body: parsed.body || parsed.message,
        data: parsed.data || data,
        attachments: parsed.attachments,
        actions: parsed.actions,
      };
    } catch {
      // If not JSON, treat as plain text
      return {
        body: transformed,
        data,
      };
    }
  } catch (error) {
    logger.error('Error transforming message:', error);
    
    // Fallback to original data
    return {
      title: data.title || 'Notification',
      body: data.message || data.body || JSON.stringify(data),
      data,
    };
  }
}
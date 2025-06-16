export interface WebhookPayload {
  id: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
  headers: Record<string, string>;
  signature?: string;
}

export interface NotificationMessage {
  id: string;
  webhookId: string;
  priority: 'high' | 'medium' | 'low';
  channels: ChannelConfig[];
  content: MessageContent;
  metadata: Record<string, any>;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageContent {
  title?: string;
  body: string;
  data: Record<string, any>;
  attachments?: Attachment[];
  actions?: Action[];
}

export interface Attachment {
  type: 'image' | 'file' | 'video';
  url: string;
  name?: string;
  size?: number;
}

export interface Action {
  type: 'button' | 'link';
  text: string;
  url?: string;
  action?: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ChannelConfig {
  type: ChannelType;
  name: string;
  config: Record<string, any>;
  template?: string;
  delay?: number;
  retryPolicy?: RetryPolicy;
}

export type ChannelType = 
  | 'email'
  | 'sms'
  | 'slack'
  | 'telegram'
  | 'discord'
  | 'teams'
  | 'webhook'
  | 'push';

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface MessageStatus {
  state: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'retry';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  deliveryInfo?: Record<string, any>;
}

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RoutingConditions;
  channels: ChannelConfig[];
  transform?: TransformRule;
}

export interface RoutingConditions {
  source?: string | string[];
  priority?: 'high' | 'medium' | 'low';
  keywords?: string[];
  fields?: Record<string, any>;
  timeWindow?: TimeWindow;
  custom?: string; // Custom JavaScript expression
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string;
  timezone: string;
  days?: number[]; // 0-6, where 0 is Sunday
}

export interface TransformRule {
  template: string;
  engine: 'handlebars' | 'jinja2';
  helpers?: Record<string, string>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  apiKeys: ApiKey[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ChannelAdapter {
  type: ChannelType;
  send(message: MessageContent, config: Record<string, any>): Promise<DeliveryResult>;
  validate(config: Record<string, any>): Promise<boolean>;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  timestamp: Date;
  error?: string;
  details?: Record<string, any>;
}

export interface QueueJob {
  id: string;
  type: 'notification';
  data: NotificationMessage;
  priority: number;
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  error?: string;
}
import { RoutingRule } from '../types';
import { logger } from '../utils/logger';

// Mock implementation - replace with database queries
const mockRules: RoutingRule[] = [
  {
    id: '1',
    name: 'Default Rule',
    enabled: true,
    priority: 0,
    conditions: {
      source: '*', // Match all sources
    },
    channels: [
      {
        type: 'webhook',
        name: 'default-webhook',
        config: {
          url: 'http://localhost:3001/webhook',
        },
      },
    ],
  },
];

export async function getRulesForSource(source: string): Promise<RoutingRule[]> {
  // TODO: Replace with database query
  return mockRules.filter(rule => {
    if (!rule.conditions.source) return true;
    if (rule.conditions.source === '*') return true;
    
    const sources = Array.isArray(rule.conditions.source) 
      ? rule.conditions.source 
      : [rule.conditions.source];
    
    return sources.includes(source) || sources.includes('*');
  });
}

export async function getAllRules(): Promise<RoutingRule[]> {
  // TODO: Replace with database query
  return mockRules;
}

export async function getRuleById(id: string): Promise<RoutingRule | null> {
  // TODO: Replace with database query
  return mockRules.find(rule => rule.id === id) || null;
}

export async function createRule(rule: Omit<RoutingRule, 'id'>): Promise<RoutingRule> {
  // TODO: Replace with database insert
  const newRule: RoutingRule = {
    ...rule,
    id: Date.now().toString(),
  };
  mockRules.push(newRule);
  return newRule;
}

export async function updateRule(id: string, updates: Partial<RoutingRule>): Promise<RoutingRule | null> {
  // TODO: Replace with database update
  const index = mockRules.findIndex(rule => rule.id === id);
  if (index === -1) return null;
  
  mockRules[index] = { ...mockRules[index], ...updates };
  return mockRules[index];
}

export async function deleteRule(id: string): Promise<boolean> {
  // TODO: Replace with database delete
  const index = mockRules.findIndex(rule => rule.id === id);
  if (index === -1) return false;
  
  mockRules.splice(index, 1);
  return true;
}
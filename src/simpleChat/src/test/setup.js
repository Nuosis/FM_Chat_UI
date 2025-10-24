import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Ensure React is available globally for tests
global.React = React;

// Mock window.fmChatConfig for tests
global.window.fmChatConfig = {
  apiKey: 'test-api-key',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  provider: 'openai',
  headers: ['content-type: application/json', 'authorization: Bearer {{API_KEY}}'],
  payload: {
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.'
      }
    ]
  }
};

// Mock FileMaker functions
global.FileMaker = {
  PerformScript: vi.fn(),
  PerformScriptWithOption: vi.fn()
};

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};
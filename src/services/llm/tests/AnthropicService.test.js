import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicService } from '../AnthropicService';
import axiosLLM from '../axiosLLM';

// Mock axiosLLM
vi.mock('../axiosLLM', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    defaults: {
      headers: {
        common: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    }
  };
  
  return {
    default: vi.fn().mockReturnValue(mockAxiosInstance)
  };
});

describe('AnthropicService', () => {
  let service;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new AnthropicService(mockApiKey);
    service.initialize(mockApiKey);
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct endpoint from provider config', () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      // Mock NODE_ENV for test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      testService.initialize(mockApiKey);
      expect(testService.config.endpoint).toBe('/anthropic/v1/messages');
      
      // Test production endpoint
      process.env.NODE_ENV = 'production';
      testService.initialize(mockApiKey);
      expect(testService.config.endpoint).toBe('https://api.anthropic.com/v1/messages');
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getModels', () => {
    it('should return models from config', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = {
        models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest1']
      };

      const models = await testService.getModels();
      expect(models).toEqual(['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest1']);
    });

    it('should return empty array when no models in config', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = {};

      const models = await testService.getModels();
      expect(models).toEqual([]);
    });

    it('should throw error when service not initialized', async () => {
      const testService = new AnthropicService(mockApiKey);
      await expect(testService.getModels()).rejects.toThrow('Service not initialized');
    });
  });

  describe('sendMessage', () => {
    const mockMessages = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ];
    const mockOptions = {
      model: 'claude-2',
      temperature: 0.7
    };

    it('should format messages correctly for Anthropic API', async () => {
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };

      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      // Let initialize() set the proper config from provider
      testService.initialize(mockApiKey);
      testService.axios = {
        ...mockAxiosInstance,
        post: vi.fn().mockResolvedValue(mockResponse)
      };

      await testService.sendMessage(mockMessages, mockOptions);

      expect(testService.axios.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        {
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Hello' }
          ],
          model: mockOptions.model,
          temperature: mockOptions.temperature,
          max_tokens: 1024,
          stream: false
        },
        {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': mockApiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
    });

    it('should handle response format correctly', async () => {
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };

      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.initialize(mockApiKey);
      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse),
        defaults: {
          headers: {
            common: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          }
        }
      };

      const response = await testService.sendMessage(mockMessages, mockOptions);
      expect(response).toEqual({
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        provider: 'ANTHROPIC',
        raw: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      });
    });

    it('should handle API errors', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.initialize(mockApiKey);
      testService.axios = {
        post: vi.fn().mockRejectedValue(new Error('API Error')),
        defaults: {
          headers: {
            common: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          }
        }
      };

      await expect(testService.sendMessage(mockMessages, mockOptions)).rejects.toThrow('API Error');
    });

    it('should handle empty messages array', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.initialize(mockApiKey);

      await expect(testService.sendMessage([], mockOptions)).rejects.toThrow('No messages provided');
    });

    it('should handle missing model option', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      
      const { model, ...optionsWithoutModel } = mockOptions;
      await expect(testService.sendMessage(mockMessages, optionsWithoutModel)).rejects.toThrow('Model is required');
    });

    it('should include tools in request when registered', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      
      // Register a mock tool
      testService.registerTool({
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => 'result'
      });

      const mockMessages = [{ role: 'user', content: 'Hello' }];
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };
      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse),
        defaults: {
          headers: {
            common: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          }
        }
      };

      await testService.sendMessage(mockMessages, mockOptions);

      const requestData = testService.axios.post.mock.calls[0][1];
      
      // Get the actual request data and config
      const [url, data, config] = testService.axios.post.mock.calls[0];
      
      // Verify request data
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('temperature');
      expect(data).toHaveProperty('max_tokens');
      
      // Verify headers
      expect(config.headers).toEqual({
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': mockApiKey,
        'anthropic-version': '2023-06-01'
      });
      
      // Verify tools formatting
      expect(requestData.tools).toBeDefined();
      expect(requestData.tools).toHaveLength(1);
      expect(requestData.tools[0]).toEqual({
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      });
      
      // Verify tool_choice
      expect(requestData.tool_choice).toBe('auto');
    });

    it('should validate request structure without tools', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);

      const mockMessages = [{ role: 'user', content: 'Hello' }];
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };

      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse),
        defaults: {
          headers: {
            common: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          }
        }
      };

      await testService.sendMessage(mockMessages, mockOptions);

      // Get the actual request data and config
      const [url, data, config] = testService.axios.post.mock.calls[0];
      
      // Verify request data
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('temperature');
      expect(data).toHaveProperty('max_tokens');
      
      // Verify tools and tool_choice are not present
      expect(data).not.toHaveProperty('tools');
      expect(data).not.toHaveProperty('tool_choice');
      
      // Verify headers
      expect(config.headers).toEqual({
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': mockApiKey,
        'anthropic-version': '2023-06-01'
      });
    });

    it('should validate request structure with multiple tools', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);

      // Register multiple tools
      testService.registerTool({
        name: 'test_tool1',
        description: 'Test tool 1',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => 'result1'
      });
      testService.registerTool({
        name: 'test_tool2',
        description: 'Test tool 2',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => 'result2'
      });

      const mockMessages = [{ role: 'user', content: 'Hello' }];
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };

      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse),
        defaults: {
          headers: {
            common: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          }
        }
      };

      await testService.sendMessage(mockMessages, mockOptions);

      // Get the actual request data and config
      const [url, data, config] = testService.axios.post.mock.calls[0];
      
      // Verify tools formatting
      expect(data.tools).toBeDefined();
      expect(data.tools).toHaveLength(2);
      // Verify headers
      expect(config.headers).toEqual({
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': mockApiKey,
        'anthropic-version': '2023-06-01'
      });

      // Verify tools
      expect(data.tools).toEqual([
        {
          type: 'function',
          function: {
            name: 'test_tool1',
            description: 'Test tool 1',
            parameters: {
              type: 'object',
              properties: {}
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'test_tool2',
            description: 'Test tool 2',
            parameters: {
              type: 'object',
              properties: {}
            }
          }
        }
      ]);
    });
  });
});
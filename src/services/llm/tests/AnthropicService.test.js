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

  describe('getModels', () => {
    it('should return available models', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'claude-3-opus-20240229' },
            { id: 'claude-3-sonnet-20240229' },
            { id: 'claude-2.1' }
          ]
        }
      };

      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };
      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };

      const models = await testService.getModels();
      expect(models).toEqual(['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-2.1']);
      expect(testService.axios.post).toHaveBeenCalledWith('/anthropic/models', {
        apiKey: mockApiKey
      });
    });

    it('should handle API errors', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };
      testService.axios = {
        post: vi.fn().mockRejectedValue(new Error('API Error'))
      };

      await expect(testService.getModels()).rejects.toThrow('API Error');
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
      testService.config = { endpoint: '/anthropic' };
      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse)
      };

      await testService.sendMessage(mockMessages, mockOptions);

      expect(testService.axios.post).toHaveBeenCalledWith('/anthropic/messages', {
        apiKey: mockApiKey,
        messages: [
          { role: 'assistant', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        model: mockOptions.model,
        temperature: mockOptions.temperature
      });
    });

    it('should handle response format correctly', async () => {
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };

      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };
      testService.axios = {
        post: vi.fn().mockResolvedValue(mockResponse)
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
      testService.config = { endpoint: '/anthropic' };
      testService.axios = {
        post: vi.fn().mockRejectedValue(new Error('API Error'))
      };

      await expect(testService.sendMessage(mockMessages, mockOptions)).rejects.toThrow('API Error');
    });

    it('should handle empty messages array', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };

      await expect(testService.sendMessage([], mockOptions)).rejects.toThrow('No messages provided');
    });

    it('should handle missing model option', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };
      
      const { model, ...optionsWithoutModel } = mockOptions;
      await expect(testService.sendMessage(mockMessages, optionsWithoutModel)).rejects.toThrow('Model is required');
    });

    it('should include tools in request when registered', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };
      
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
      testService.axios.post.mockResolvedValue(mockResponse);

      await testService.sendMessage(mockMessages, mockOptions);

      const requestData = testService.axios.post.mock.calls[0][1];
      
      // Verify required keys
      expect(requestData).toHaveProperty('model');
      expect(requestData).toHaveProperty('messages');
      expect(requestData).toHaveProperty('temperature');
      
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
      testService.config = { endpoint: '/anthropic' };

      const mockMessages = [{ role: 'user', content: 'Hello' }];
      await testService.sendMessage(mockMessages, mockOptions);

      const requestData = testService.axios.post.mock.calls[0][1];
      
      // Verify required keys
      expect(requestData).toHaveProperty('model');
      expect(requestData).toHaveProperty('messages');
      expect(requestData).toHaveProperty('temperature');
      
      // Verify tools and tool_choice are not present
      expect(requestData).not.toHaveProperty('tools');
      expect(requestData).not.toHaveProperty('tool_choice');
    });

    it('should validate request structure with multiple tools', async () => {
      const testService = new AnthropicService(mockApiKey);
      testService.initialize(mockApiKey);
      testService.config = { endpoint: '/anthropic' };

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
      await testService.sendMessage(mockMessages, mockOptions);

      const requestData = testService.axios.post.mock.calls[0][1];
      
      // Verify tools formatting
      expect(requestData.tools).toBeDefined();
      expect(requestData.tools).toHaveLength(2);
      expect(requestData.tools).toEqual([
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
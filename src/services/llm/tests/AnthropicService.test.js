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
  });
});
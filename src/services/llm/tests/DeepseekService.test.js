import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeepseekService } from '../DeepseekService';
import axiosLLM from '../axiosLLM';

// Mock axiosLLM
vi.mock('../axiosLLM', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

describe('DeepseekService', () => {
  let service;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new DeepseekService(mockApiKey);
    vi.clearAllMocks();
  });

  describe('getModels', () => {
    it('should return available models', async () => {
      axiosLLM.post.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'deepseek-chat' },
            { id: 'deepseek-coder' }
          ]
        }
      });

      const models = await service.getModels();
      expect(models).toEqual(['deepseek-chat', 'deepseek-coder']);
      expect(axiosLLM.post).toHaveBeenCalledWith('/deepseek/models', {
        apiKey: mockApiKey
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      axiosLLM.post.mockRejectedValueOnce(error);

      await expect(service.getModels()).rejects.toThrow('API Error');
    });
  });

  describe('sendMessage', () => {
    const mockMessages = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ];
    const mockOptions = {
      model: 'deepseek-chat',
      temperature: 0.7
    };

    it('should format messages correctly for Deepseek API', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Hello! How can I help you today?'
            }
          }]
        }
      };

      axiosLLM.post.mockResolvedValueOnce(mockResponse);

      await service.sendMessage(mockMessages, mockOptions);

      expect(axiosLLM.post).toHaveBeenCalledWith('/deepseek/chat/completions', {
        apiKey: mockApiKey,
        messages: mockMessages,
        model: mockOptions.model,
        temperature: mockOptions.temperature,
        stream: false
      });
    });

    it('should handle response format correctly', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Hello! How can I help you today?'
            }
          }]
        }
      };

      axiosLLM.post.mockResolvedValueOnce(mockResponse);

      const response = await service.sendMessage(mockMessages, mockOptions);
      expect(response).toEqual({
        content: 'Hello! How can I help you today?'
      });
    });

    it('should handle streaming responses', async () => {
      const mockChunks = [
        { data: { choices: [{ delta: { content: 'Hello' } }] } },
        { data: { choices: [{ delta: { content: ' world' } }] } },
        { data: { choices: [{ delta: { content: '!' } }] } }
      ];

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of mockChunks) {
            yield { data: JSON.stringify(chunk) };
          }
        }
      };

      axiosLLM.post.mockResolvedValueOnce({ data: mockStream });

      const onProgress = vi.fn();
      const response = await service.sendMessage(mockMessages, mockOptions, onProgress);

      expect(response).toEqual({
        content: 'Hello world!'
      });

      expect(onProgress).toHaveBeenCalledWith('Hello');
      expect(onProgress).toHaveBeenCalledWith('Hello world');
      expect(onProgress).toHaveBeenCalledWith('Hello world!');

      expect(axiosLLM.post).toHaveBeenCalledWith('/deepseek/chat/completions', {
        apiKey: mockApiKey,
        messages: mockMessages,
        model: mockOptions.model,
        temperature: mockOptions.temperature,
        stream: true
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      axiosLLM.post.mockRejectedValueOnce(error);

      await expect(service.sendMessage(mockMessages, mockOptions)).rejects.toThrow('API Error');
    });

    it('should handle streaming errors', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          throw new Error('Stream Error');
        }
      };

      axiosLLM.post.mockResolvedValueOnce({ data: mockStream });

      await expect(service.sendMessage(mockMessages, mockOptions, vi.fn())).rejects.toThrow('Stream Error');
    });

    it('should handle empty messages array', async () => {
      await expect(service.sendMessage([], mockOptions)).rejects.toThrow('No messages provided');
    });

    it('should handle missing model option', async () => {
      const { model, ...optionsWithoutModel } = mockOptions;
      await expect(service.sendMessage(mockMessages, optionsWithoutModel)).rejects.toThrow('Model is required');
    });

    it('should handle invalid message format', async () => {
      const invalidMessages = [
        { invalid: 'format' }
      ];

      await expect(service.sendMessage(invalidMessages, mockOptions)).rejects.toThrow('Invalid message format');
    });
  });
});
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
      axiosLLM.post.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'claude-2' },
            { id: 'claude-instant-1' }
          ]
        }
      });

      const models = await service.getModels();
      expect(models).toEqual(['claude-2', 'claude-instant-1']);
      expect(axiosLLM.post).toHaveBeenCalledWith('/anthropic/models', {
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
      model: 'claude-2',
      temperature: 0.7
    };

    it('should format messages correctly for Anthropic API', async () => {
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
        }
      };

      axiosLLM.post.mockResolvedValueOnce(mockResponse);

      await service.sendMessage(mockMessages, mockOptions);

      expect(axiosLLM.post).toHaveBeenCalledWith('/anthropic/messages', {
        apiKey: mockApiKey,
        messages: [
          { role: 'assistant', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        model: mockOptions.model,
        temperature: mockOptions.temperature,
        stream: false
      });
    });

    it('should handle response format correctly', async () => {
      const mockResponse = {
        data: {
          content: [{ text: 'Hello! How can I help you today?' }]
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
        { data: { delta: { text: 'Hello' } } },
        { data: { delta: { text: ' world' } } },
        { data: { delta: { text: '!' } } }
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

      expect(axiosLLM.post).toHaveBeenCalledWith('/anthropic/messages', {
        apiKey: mockApiKey,
        messages: expect.any(Array),
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
  });
});
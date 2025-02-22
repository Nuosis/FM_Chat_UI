import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeepseekService } from '../DeepseekService';
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

describe('DeepseekService', () => {
  let service;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new DeepseekService();
    service.initialize(mockApiKey);
    service.config = {
      endpoint: '/deepseek',
      headers: {
        'Authorization': `Bearer ${mockApiKey}`
      }
    };
    vi.clearAllMocks();
  });

  describe('formatAndSendRequest', () => {
    it('should format messages correctly', async () => {
      const mockMessages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' }
      ];
      const mockOptions = {
        model: 'deepseek-chat',
        temperature: 0.7
      };

      const mockResponse = {
        data: {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Hello! How can I help?'
            }
          }]
        }
      };

      axiosLLM().post.mockResolvedValue(mockResponse);

      await service.formatAndSendRequest(mockMessages, mockOptions);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        '/deepseek',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': 'Bearer test-api-key'
          }
        }
      );
    });

    it('should use default model and temperature if not provided', async () => {
      const mockMessages = [{ role: 'user', content: 'Hi' }];
      
      await service.formatAndSendRequest(mockMessages);
      
      expect(axiosLLM().post).toHaveBeenCalledWith(
        '/deepseek',
        expect.objectContaining({
          model: 'deepseek-chat',
          temperature: 0.7
        }),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      axiosLLM().post.mockRejectedValue(new Error('API Error'));
      
      await expect(service.formatAndSendRequest([])).rejects.toThrow('API Error');
    });
  });

  describe('parseResponse', () => {
    it('should parse successful response correctly', () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Hello! How can I help?'
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      
      expect(result).toEqual({
        content: 'Hello! How can I help?',
        role: 'assistant',
        provider: 'DEEPSEEK',
        raw: mockResponse.data
      });
    });

    it('should throw error if no choices in response', () => {
      const mockResponse = {
        data: {
          choices: []
        }
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('No response from Deepseek');
    });

    it('should throw error if invalid response structure', () => {
      const mockResponse = {
        data: {}
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('No response from Deepseek');
    });
  });
});
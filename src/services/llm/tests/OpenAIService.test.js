import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIService } from '../OpenAIService';
import axiosLLM from '../axiosLLM';

// Mock axiosLLM
vi.mock('../axiosLLM', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
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

describe('OpenAIService', () => {
  let service;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new OpenAIService();
    service.initialize(mockApiKey);
    service.config = {
      endpoint: '/openai/chat/completions',
      modelsEndpoint: '/openai/models',
      headers: {
        'Authorization': `Bearer ${mockApiKey}`
      }
    };
    vi.clearAllMocks();
  });

  describe('fetchModels', () => {
    it('should return filtered GPT models', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' },
            { id: 'text-davinci-003' },
            { id: 'gpt-4-instruct' }
          ]
        }
      };

      axiosLLM().get.mockResolvedValue(mockResponse);

      const models = await service.fetchModels();
      expect(models).toEqual(['gpt-4', 'gpt-3.5-turbo']);
      expect(axiosLLM().get).toHaveBeenCalledWith(
        '/openai/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`
          })
        })
      );
    });

    it('should handle API errors', async () => {
      axiosLLM().get.mockRejectedValue(new Error('API Error'));
      await expect(service.fetchModels()).rejects.toThrow('API Error');
    });
  });

  describe('formatAndSendRequest', () => {
    const mockMessages = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ];
    const mockOptions = {
      model: 'gpt-4',
      temperature: 0.7
    };

    it('should format and send request correctly', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Hello! How can I help you today?',
              role: 'assistant'
            }
          }]
        }
      };

      axiosLLM().post.mockResolvedValue(mockResponse);

      await service.formatAndSendRequest(mockMessages, mockOptions);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        '/openai/chat/completions',
        {
          model: mockOptions.model,
          messages: mockMessages.map(msg => ({
            role: msg.role || 'user',
            content: msg.content
          })),
          temperature: mockOptions.temperature,
          tool_choice: undefined
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`
          })
        })
      );
    });

    it('should include tools in request when provided', async () => {
      const mockTools = [{
        name: 'testTool',
        description: 'Test tool',
        parameters: {}
      }];

      const optionsWithTools = {
        ...mockOptions,
        tools: mockTools
      };

      await service.formatAndSendRequest(mockMessages, optionsWithTools);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        '/openai/chat/completions',
        expect.objectContaining({
          tools: mockTools,
          tool_choice: 'auto'
        }),
        expect.any(Object)
      );
    });
  });

  describe('parseResponse', () => {
    it('should parse successful response', () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Hello!',
              role: 'assistant',
              tool_calls: []
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      expect(result).toEqual({
        content: 'Hello!',
        role: 'assistant',
        provider: 'OPENAI',
        tool_calls: [],
        raw: mockResponse.data
      });
    });

    it('should handle tool calls in response', () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [{
                id: '1',
                function: {
                  name: 'testTool',
                  arguments: '{}'
                }
              }]
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      expect(result.tool_calls).toBeDefined();
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0]).toEqual(mockResponse.data.choices[0].message.tool_calls[0]);
    });

    it('should throw error for invalid response', () => {
      const mockResponse = {
        data: {}
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('No response from OpenAI');
    });

    it('should throw error when choices array is empty', () => {
      const mockResponse = {
        data: {
          choices: []
        }
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('No response from OpenAI');
    });
  });
});
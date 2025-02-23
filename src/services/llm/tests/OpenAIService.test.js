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
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct endpoints from provider config', () => {
      const testService = new OpenAIService();
      testService.initialize(mockApiKey);
      expect(testService.config.endpoint).toBe('https://api.openai.com/v1/chat/completions');
      expect(testService.config.modelsEndpoint).toBe('https://api.openai.com/v1/models');
    });
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
        'https://api.openai.com/v1/models',
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
        'https://api.openai.com/v1/chat/completions',
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

    it('should properly format messages with tool calls', async () => {
      const messagesWithToolCalls = [
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          content: '',
          tool_calls: [{
            id: 'call_123',
            function: { name: 'test_tool', arguments: '{}' }
          }]
        },
        {
          role: 'tool',
          content: 'tool result',
          tool_call_id: 'call_123'
        }
      ];

      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Response after tool call',
              role: 'assistant'
            }
          }]
        }
      };

      axiosLLM().post.mockResolvedValue(mockResponse);

      await service.formatAndSendRequest(messagesWithToolCalls, mockOptions);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          model: mockOptions.model,
          messages: [
            {
              role: 'user',
              content: 'Hello'
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'test_tool',
                  arguments: '{}'
                }
              }]
            },
            {
              role: 'tool',
              content: 'tool result',
              tool_call_id: 'call_123'
            }
          ],
          temperature: mockOptions.temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json'
          }
        }
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

      const requestData = axiosLLM().post.mock.calls[0][1];
      
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
          name: 'testTool',
          description: 'Test tool',
          parameters: {}
        }
      });
      
      // Verify tool_choice
      expect(requestData.tool_choice).toBe('auto');
    });

    it('should validate request structure without tools', async () => {
      await service.formatAndSendRequest(mockMessages, mockOptions);

      const requestData = axiosLLM().post.mock.calls[0][1];
      
      // Verify required keys
      expect(requestData).toHaveProperty('model');
      expect(requestData).toHaveProperty('messages');
      expect(requestData).toHaveProperty('temperature');
      
      // Verify tools and tool_choice are not present
      expect(requestData).not.toHaveProperty('tools');
      expect(requestData).not.toHaveProperty('tool_choice');
    });

    it('should validate request structure with multiple tools', async () => {
      const mockTools = [
        {
          name: 'testTool1',
          description: 'Test tool 1',
          parameters: {}
        },
        {
          name: 'testTool2',
          description: 'Test tool 2',
          parameters: {}
        }
      ];

      const optionsWithTools = {
        ...mockOptions,
        tools: mockTools
      };

      await service.formatAndSendRequest(mockMessages, optionsWithTools);

      const requestData = axiosLLM().post.mock.calls[0][1];
      
      // Verify tools formatting
      expect(requestData.tools).toBeDefined();
      expect(requestData.tools).toHaveLength(2);
      expect(requestData.tools).toEqual([
        {
          type: 'function',
          function: {
            name: 'testTool1',
            description: 'Test tool 1',
            parameters: {}
          }
        },
        {
          type: 'function',
          function: {
            name: 'testTool2',
            description: 'Test tool 2',
            parameters: {}
          }
        }
      ]);
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
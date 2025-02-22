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

      await service.formatAndSendRequest(messagesWithToolCalls);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        '/deepseek',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'assistant',
              content: '',
              tool_calls: expect.arrayContaining([{
                id: 'call_123',
                function: expect.any(Object)
              }])
            }),
            expect.objectContaining({
              role: 'tool',
              content: 'tool result',
              tool_call_id: 'call_123'
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should include tools in request when registered', async () => {
      // Register a mock tool
      service.registerTool({
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => 'result'
      });

      const mockMessages = [{ role: 'user', content: 'Hello' }];
      await service.formatAndSendRequest(mockMessages);

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
      const mockMessages = [{ role: 'user', content: 'Hello' }];
      await service.formatAndSendRequest(mockMessages);

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
      // Register multiple tools
      service.registerTool({
        name: 'test_tool1',
        description: 'Test tool 1',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => 'result1'
      });
      service.registerTool({
        name: 'test_tool2',
        description: 'Test tool 2',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => 'result2'
      });

      const mockMessages = [{ role: 'user', content: 'Hello' }];
      await service.formatAndSendRequest(mockMessages);

      const requestData = axiosLLM().post.mock.calls[0][1];
      
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

    it('should parse response with tool calls', () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [{
                id: 'call_123',
                function: {
                  name: 'test_tool',
                  arguments: '{}'
                }
              }]
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      
      expect(result).toEqual({
        content: '',
        role: 'assistant',
        provider: 'DEEPSEEK',
        tool_calls: [{
          id: 'call_123',
          function: {
            name: 'test_tool',
            arguments: '{}'
          }
        }],
        raw: mockResponse.data
      });
    });

    it('should handle response without tool calls', () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Hello'
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      
      expect(result).toEqual({
        content: 'Hello',
        role: 'assistant',
        provider: 'DEEPSEEK',
        tool_calls: [],
        raw: mockResponse.data
      });
    });
  });
});
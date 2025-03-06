import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiService } from '../GeminiService';
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

describe('GeminiService', () => {
  let service;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new GeminiService();
    service.initialize(mockApiKey);
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct endpoints from provider config', () => {
      const testService = new GeminiService();
      testService.initialize(mockApiKey);
      expect(testService.config.endpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models');
      expect(testService.config.headers['x-goog-api-key']).toBe(mockApiKey);
    });
  });

  describe('fetchModels', () => {
    it('should return predefined Gemini models', async () => {
      const models = await service.fetchModels();
      expect(models).toEqual([
        'gemini-2.0-flash',
        'gemini-2.0-pro',
        'gemini-2.0-flash-Lite'
      ]);
      // No API call should be made since models are hardcoded
      expect(axiosLLM().get).not.toHaveBeenCalled();
    });
  });

  describe('formatAndSendRequest', () => {
    const mockMessages = [
      { role: 'user', content: 'Hello' }
    ];
    const mockOptions = {
      model: 'gemini-2.0-pro',
      temperature: 0.7
    };

    it('should format and send request correctly', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{ text: 'Hello! How can I help you today?' }],
              role: 'model'
            }
          }]
        }
      };

      axiosLLM().post.mockResolvedValue(mockResponse);

      await service.formatAndSendRequest(mockMessages, mockOptions);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent',
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello' }]
            }
          ],
          generationConfig: {
            temperature: mockOptions.temperature,
          },
          tools: undefined
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-goog-api-key': mockApiKey
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
          candidates: [{
            content: {
              parts: [{ text: 'Response after tool call' }],
              role: 'model'
            }
          }]
        }
      };

      axiosLLM().post.mockResolvedValue(mockResponse);

      await service.formatAndSendRequest(messagesWithToolCalls, mockOptions);

      expect(axiosLLM().post).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent',
        expect.objectContaining({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello' }]
            },
            {
              role: 'model',
              parts: [
                { text: '' },
                {
                  function_call: {
                    name: 'test_tool',
                    args: {}
                  }
                }
              ]
            },
            {
              role: 'tool',
              parts: [
                { text: 'tool result' },
                {
                  function_response: {
                    name: undefined,
                    response: { result: 'tool result' }
                  }
                }
              ]
            }
          ]
        }),
        expect.any(Object)
      );
    });

    it('should include tools in request when registered', async () => {
      // Register a mock tool
      service.registerTool({
        name: 'testTool',
        description: 'Test tool',
        parameters: {
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        },
        execute: vi.fn()
      });

      await service.formatAndSendRequest(mockMessages, mockOptions);

      const requestData = axiosLLM().post.mock.calls[0][1];
      
      // Verify tools formatting
      expect(requestData.tools).toBeDefined();
      expect(requestData.tools).toHaveLength(1);
      expect(requestData.tools[0]).toEqual({
        function_declarations: [{
          name: 'testTool',
          description: 'Test tool',
          parameters: {
            properties: {
              param1: { type: 'string' }
            },
            required: ['param1']
          }
        }]
      });
    });
  });

  describe('parseResponse', () => {
    it('should parse successful response', () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{ text: 'Hello!' }],
              role: 'model'
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      expect(result).toEqual({
        content: 'Hello!',
        role: 'assistant',
        provider: 'GEMINI',
        tool_calls: undefined,
        raw: mockResponse.data
      });
    });

    it('should handle tool calls in response', () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [
                { text: '' },
                {
                  function_call: {
                    name: 'testTool',
                    args: { param1: 'value1' }
                  }
                }
              ],
              role: 'model'
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);
      expect(result.tool_calls).toBeDefined();
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0].function.name).toBe('testTool');
      expect(result.tool_calls[0].function.arguments).toBe('{"param1":"value1"}');
    });

    it('should throw error for invalid response', () => {
      const mockResponse = {
        data: {}
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('No response from Gemini');
    });

    it('should throw error when candidates array is empty', () => {
      const mockResponse = {
        data: {
          candidates: []
        }
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('No response from Gemini');
    });

    it('should throw error when content parts are missing', () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              role: 'model'
            }
          }]
        }
      };

      expect(() => service.parseResponse(mockResponse)).toThrow('Invalid response format from Gemini');
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaService } from '../OllamaService';
import * as providerEndpoints from '../../../../utils/providerEndpoints';
import * as axiosLLM from '../axiosLLM';

// Mock dependencies
vi.mock('../../../../utils/providerEndpoints');
vi.mock('../axiosLLM');

describe('OllamaService', () => {
  let service;
  let mockAxios;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock provider endpoint
    providerEndpoints.getProviderEndpoint.mockReturnValue({
      endpoint: 'http://localhost:11434/api/chat',
      modelsEndpoint: 'http://localhost:11434/api/tags',
      headers: {}
    });

    // Setup mock axios instance
    mockAxios = {
      get: vi.fn(),
      post: vi.fn()
    };
    axiosLLM.default.mockReturnValue(mockAxios);

    // Create new service instance
    service = new OllamaService();
    service.initialize();
  });

  describe('initialization', () => {
    it('should initialize without API key', () => {
      expect(() => service.initialize()).not.toThrow();
      expect(service.config).toBeDefined();
      expect(service.axios).toBeDefined();
    });

    it('should throw error for invalid provider config', () => {
      providerEndpoints.getProviderEndpoint.mockReturnValue(null);
      expect(() => service.initialize()).toThrow('Invalid provider: OLLAMA');
    });
  });

  describe('fetchModels', () => {
    it('should fetch and format models list', async () => {
      const mockResponse = {
        data: {
          models: [
            { name: 'llama2' },
            { name: 'codellama' }
          ]
        }
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await service.fetchModels();

      expect(mockAxios.get).toHaveBeenCalledWith(service.config.modelsEndpoint);
      expect(result).toEqual(['llama2', 'codellama']);
    });

    it('should handle fetch models error', async () => {
      const error = new Error('Network error');
      mockAxios.get.mockRejectedValue(error);

      await expect(service.fetchModels())
        .rejects.toThrow('Network error');
    });
  });

  describe('formatAndSendRequest', () => {
    const mockMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ];

    it('should format messages and send request with default options', async () => {
      const mockResponse = {
        data: { message: { content: 'Response' } }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.formatAndSendRequest(mockMessages);

      expect(mockAxios.post).toHaveBeenCalledWith(
        service.config.endpoint,
        {
          model: 'llama2',
          messages: mockMessages,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        },
        { headers: service.config.headers }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should use custom model and temperature', async () => {
      const mockResponse = {
        data: { message: { content: 'Response' } }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.formatAndSendRequest(mockMessages, {
        model: 'codellama',
        temperature: 0.5
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        service.config.endpoint,
        {
          model: 'codellama',
          messages: mockMessages,
          options: {
            temperature: 0.5,
            top_p: 0.9
          }
        },
        { headers: service.config.headers }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle request error', async () => {
      const error = new Error('Request failed');
      mockAxios.post.mockRejectedValue(error);

      await expect(service.formatAndSendRequest(mockMessages))
        .rejects.toThrow('Request failed');
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
        data: { message: { content: 'Response after tool call' } }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await service.formatAndSendRequest(messagesWithToolCalls);

      expect(mockAxios.post).toHaveBeenCalledWith(
        service.config.endpoint,
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

      const requestData = mockAxios.post.mock.calls[0][1];
      
      // Verify required keys
      expect(requestData).toHaveProperty('model');
      expect(requestData).toHaveProperty('messages');
      expect(requestData).toHaveProperty('options');
      
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

      const requestData = mockAxios.post.mock.calls[0][1];
      
      // Verify required keys
      expect(requestData).toHaveProperty('model');
      expect(requestData).toHaveProperty('messages');
      expect(requestData).toHaveProperty('options');
      
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

      const requestData = mockAxios.post.mock.calls[0][1];
      
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
    it('should parse valid response', () => {
      const mockResponse = {
        message: {
          content: 'Hello world'
        }
      };

      const result = service.parseResponse(mockResponse);

      expect(result).toEqual({
        content: 'Hello world',
        role: 'assistant',
        provider: 'OLLAMA',
        raw: mockResponse
      });
    });

    it('should handle missing message in response', () => {
      expect(() => service.parseResponse({}))
        .toThrow('Invalid response from Ollama');
    });

    it('should handle null response', () => {
      expect(() => service.parseResponse(null))
        .toThrow('Invalid response from Ollama');
    });

    it('should parse response with tool calls', () => {
      const mockResponse = {
        message: {
          content: '',
          tool_calls: [{
            id: 'call_123',
            function: {
              name: 'test_tool',
              arguments: '{}'
            }
          }]
        }
      };

      const result = service.parseResponse(mockResponse);

      expect(result).toEqual({
        content: '',
        role: 'assistant',
        provider: 'OLLAMA',
        tool_calls: [{
          id: 'call_123',
          function: {
            name: 'test_tool',
            arguments: '{}'
          }
        }],
        raw: mockResponse
      });
    });

    it('should handle response without tool calls', () => {
      const mockResponse = {
        message: {
          content: 'Hello world'
        }
      };

      const result = service.parseResponse(mockResponse);

      expect(result).toEqual({
        content: 'Hello world',
        role: 'assistant',
        provider: 'OLLAMA',
        tool_calls: [],
        raw: mockResponse
      });
    });
  });
});
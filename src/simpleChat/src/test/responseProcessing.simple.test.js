import { describe, it, expect, beforeEach } from 'vitest';
import { processAPIResponse } from '../service/openai.js';
import { processResponse } from '../service/processRouter.js';
import validResponseData from '../../validresponse.json';
import errorResponseData from '../../errorresponse.json';

describe('Response Processing - Core Tests', () => {
  beforeEach(() => {
    // Reset window.fmChatConfig before each test
    global.window = {
      fmChatConfig: {
        apiKey: 'test-api-key',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        provider: 'openai',
        headers: ['content-type: application/json', 'authorization: Bearer {{API_KEY}}'],
        payload: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant.'
            }
          ]
        }
      }
    };
  });

  describe('Valid Response Processing', () => {
    it('should correctly extract content from valid OpenAI response', () => {
      const result = processAPIResponse(validResponseData);
      expect(result).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
    });

    it('should handle valid response as JSON string', () => {
      const stringResponse = JSON.stringify(validResponseData);
      const result = processAPIResponse(stringResponse);
      expect(result).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
    });

    it('should process valid response and update conversation history', () => {
      const initialMessageCount = window.fmChatConfig.payload.messages.length;
      const result = processResponse(validResponseData);
      
      expect(result).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
      expect(window.fmChatConfig.payload.messages).toHaveLength(initialMessageCount + 1);
      
      const lastMessage = window.fmChatConfig.payload.messages[window.fmChatConfig.payload.messages.length - 1];
      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
    });
  });

  describe('Error Response Processing', () => {
    it('should correctly format error response', () => {
      const result = processAPIResponse(errorResponseData);
      expect(result).toContain('API Error: Missing required parameter: \'tools[0].function\'.');
      expect(result).toContain('Type: invalid_request_error');
      expect(result).toContain('Code: missing_required_parameter');
    });

    it('should process error response and update conversation history', () => {
      const initialMessageCount = window.fmChatConfig.payload.messages.length;
      const result = processResponse(errorResponseData);
      
      expect(result).toContain('API Error: Missing required parameter');
      expect(window.fmChatConfig.payload.messages).toHaveLength(initialMessageCount + 1);
      
      const lastMessage = window.fmChatConfig.payload.messages[window.fmChatConfig.payload.messages.length - 1];
      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toContain('API Error');
    });

    it('should handle error with only message field', () => {
      const errorWithMessageOnly = {
        error: {
          message: 'Simple error message'
        }
      };
      const result = processAPIResponse(errorWithMessageOnly);
      expect(result).toBe('API Error: Simple error message');
    });

    it('should handle error with all fields', () => {
      const completeError = {
        error: {
          message: 'Complete error',
          type: 'api_error',
          code: 'rate_limit_exceeded'
        }
      };
      const result = processAPIResponse(completeError);
      expect(result).toBe('API Error: Complete error (Type: api_error) (Code: rate_limit_exceeded)');
    });
  });

  describe('Alternative Response Formats', () => {
    it('should handle Anthropic format response', () => {
      const anthropicResponse = {
        content: [
          {
            text: 'This is an Anthropic response',
            type: 'text'
          }
        ]
      };
      const result = processAPIResponse(anthropicResponse);
      expect(result).toBe('This is an Anthropic response');
    });

    it('should handle Ollama format response', () => {
      const ollamaResponse = {
        message: {
          content: 'This is an Ollama response'
        }
      };
      const result = processAPIResponse(ollamaResponse);
      expect(result).toBe('This is an Ollama response');
    });

    it('should handle direct content field', () => {
      const directResponse = {
        content: 'Direct content response'
      };
      const result = processAPIResponse(directResponse);
      expect(result).toBe('Direct content response');
    });

    it('should handle simulated response format', () => {
      const simulatedResponse = {
        message: 'Simulated response message'
      };
      const result = processAPIResponse(simulatedResponse);
      expect(result).toBe('Simulated response message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined responses', () => {
      expect(processAPIResponse(null)).toBe('No response received.');
      expect(processAPIResponse(undefined)).toBe('No response received.');
    });

    it('should handle empty object', () => {
      expect(processAPIResponse({})).toBe('No response received.');
    });

    it('should handle empty string', () => {
      expect(processAPIResponse('')).toBe('No response received.');
    });

    it('should handle plain text string', () => {
      const plainText = 'This is just plain text';
      expect(processAPIResponse(plainText)).toBe(plainText);
    });

    it('should handle malformed JSON string', () => {
      const malformedJson = '{"invalid": json}';
      expect(processAPIResponse(malformedJson)).toBe(malformedJson);
    });

    it('should handle response with empty choices array', () => {
      const emptyChoices = {
        choices: []
      };
      expect(processAPIResponse(emptyChoices)).toBe('No response received.');
    });

    it('should handle response with choices but no message', () => {
      const noMessage = {
        choices: [
          {
            index: 0
          }
        ]
      };
      expect(processAPIResponse(noMessage)).toBe('No response received.');
    });

    it('should handle response with message but no content', () => {
      const noContent = {
        choices: [
          {
            message: {
              role: 'assistant'
            }
          }
        ]
      };
      // The implementation should return default message for missing content
      expect(processAPIResponse(noContent)).toBe('No response received.');
    });
  });

  describe('Environment Consistency', () => {
    it('should produce consistent results regardless of environment', () => {
      // Test that the same response produces the same output
      const result1 = processAPIResponse(validResponseData);
      const result2 = processAPIResponse(validResponseData);
      expect(result1).toBe(result2);
      expect(result1).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
    });

    it('should handle error responses consistently', () => {
      const result1 = processAPIResponse(errorResponseData);
      const result2 = processAPIResponse(errorResponseData);
      expect(result1).toBe(result2);
      expect(result1).toContain('API Error: Missing required parameter');
    });
  });

  describe('Response Structure Validation', () => {
    it('should validate valid response structure', () => {
      expect(validResponseData).toHaveProperty('choices');
      expect(validResponseData.choices).toBeInstanceOf(Array);
      expect(validResponseData.choices[0]).toHaveProperty('message');
      expect(validResponseData.choices[0].message).toHaveProperty('content');
      expect(validResponseData.choices[0].message.content).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
    });

    it('should validate error response structure', () => {
      expect(errorResponseData).toHaveProperty('error');
      expect(errorResponseData.error).toHaveProperty('message');
      expect(errorResponseData.error).toHaveProperty('type');
      expect(errorResponseData.error).toHaveProperty('code');
      expect(errorResponseData.error.message).toBe('Missing required parameter: \'tools[0].function\'.');
      expect(errorResponseData.error.type).toBe('invalid_request_error');
      expect(errorResponseData.error.code).toBe('missing_required_parameter');
    });
  });

  describe('Conversation History Management', () => {
    it('should handle missing window.fmChatConfig gracefully', () => {
      delete global.window.fmChatConfig;
      
      const result = processResponse(validResponseData);
      expect(result).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
      // Should not throw an error even without fmChatConfig
    });

    it('should handle missing payload.messages gracefully', () => {
      delete global.window.fmChatConfig.payload.messages;
      
      const result = processResponse(validResponseData);
      expect(result).toBe('Hello! I\'m working correctly. This is a valid response from the OpenAI API.');
      // Should not throw an error even without messages array
    });
  });
});
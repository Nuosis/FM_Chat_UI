import { describe, it, expect, beforeEach } from 'vitest';
import sqlGeneratorTool from '../SQLGeneratorTool';
import { vi } from 'vitest';
import llmServiceFactory from '../../../llm';

// Mock LLM service factory
vi.mock('../../../llm', () => ({
  default: {
    initializeService: vi.fn().mockResolvedValue({
      sendMessage: vi.fn().mockResolvedValue({
        content: 'SELECT * FROM users'
      })
    })
  }
}));

describe('SQLGeneratorTool', () => {
  let tool;

  beforeEach(() => {
    tool = sqlGeneratorTool;
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have required properties', () => {
      expect(tool.name).toBe('sql_generator');
      expect(tool.description).toContain('Generate and validate SQL SELECT statements');
      expect(tool.parameters).toBeDefined();
    });

    it('should have valid parameters schema', () => {
      expect(tool.parameters).toEqual({
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: expect.any(String)
          },
          schema: {
            type: 'object',
            description: expect.any(String)
          }
        },
        required: ['description', 'schema']
      });
    });
  });

  describe('execute', () => {
    const mockStore = {
      getState: vi.fn().mockReturnValue({
        llm: {
          provider: 'test-provider',
          model: 'test-model'
        }
      })
    };

    vi.mock('../../../redux/store', () => ({
      store: mockStore
    }));

    const validInput = {
      description: 'Find all active customers',
      schema: {
        tables: {
          Customers: {
            fields: ['CustomerID', 'Name', 'Status'],
            relationships: []
          }
        }
      }
    };

    it('should generate valid SQL query', async () => {
      const result = await tool.execute(validInput);
      
      expect(result).toEqual({
        sql: expect.stringContaining('SELECT'),
        valid: true,
        scriptParams: {
          query: expect.stringContaining('SELECT'),
          tables: expect.arrayContaining(['users'])
        }
      });
    });

    it('should handle invalid SQL generation', async () => {
      const llmService = await llmServiceFactory.initializeService();
      llmService.sendMessage.mockResolvedValueOnce({
        content: 'INVALID SQL STATEMENT'
      });

      const result = await tool.execute(validInput);
      
      expect(result).toEqual({
        sql: 'INVALID SQL STATEMENT',
        valid: false,
        error: expect.any(String)
      });
    });

    it('should validate input parameters', async () => {
      const invalidInput = {
        description: 'Find customers'
        // Missing schema
      };

      await expect(tool.execute(invalidInput)).rejects.toThrow();
    });

    it('should handle LLM service errors', async () => {
      const llmService = await llmServiceFactory.initializeService();
      llmService.sendMessage.mockRejectedValueOnce(new Error('LLM error'));

      await expect(tool.execute(validInput)).rejects.toThrow('Failed to generate SQL');
    });
  });
});
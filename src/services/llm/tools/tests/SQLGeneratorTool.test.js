import { describe, it, expect, beforeEach } from 'vitest';
import { SQLGeneratorTool } from '../SQLGeneratorTool';

describe('SQLGeneratorTool', () => {
  let tool;

  beforeEach(() => {
    tool = new SQLGeneratorTool();
  });

  describe('Tool Definition', () => {
    it('should have required properties', () => {
      expect(tool.name).toBe('sqlGenerator');
      expect(tool.description).toContain('Generate SQL queries');
      expect(tool.schema).toBeDefined();
    });

    it('should have valid JSON schema', () => {
      expect(tool.schema).toEqual({
        type: 'object',
        properties: {
          tables: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                columns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' }
                    },
                    required: ['name', 'type']
                  }
                }
              },
              required: ['name', 'columns']
            }
          },
          query: { type: 'string' }
        },
        required: ['tables', 'query']
      });
    });
  });

  describe('execute', () => {
    const validInput = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER' },
            { name: 'name', type: 'TEXT' },
            { name: 'email', type: 'TEXT' }
          ]
        }
      ],
      query: 'Find all users'
    };

    it('should generate SELECT query', async () => {
      const result = await tool.execute({
        ...validInput,
        query: 'Find all users'
      });

      expect(result).toContain('SELECT');
      expect(result).toContain('FROM users');
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should generate INSERT query', async () => {
      const result = await tool.execute({
        ...validInput,
        query: 'Add a new user'
      });

      expect(result).toContain('INSERT INTO users');
      expect(result).toContain('VALUES');
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should generate UPDATE query', async () => {
      const result = await tool.execute({
        ...validInput,
        query: 'Update user email'
      });

      expect(result).toContain('UPDATE users');
      expect(result).toContain('SET');
      expect(result).toContain('WHERE');
      expect(result).toContain('email');
    });

    it('should generate DELETE query', async () => {
      const result = await tool.execute({
        ...validInput,
        query: 'Delete a user'
      });

      expect(result).toContain('DELETE FROM users');
      expect(result).toContain('WHERE');
    });

    it('should handle multiple tables', async () => {
      const result = await tool.execute({
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' }
            ]
          },
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'INTEGER' },
              { name: 'user_id', type: 'INTEGER' },
              { name: 'total', type: 'DECIMAL' }
            ]
          }
        ],
        query: 'Find all orders for each user'
      });

      expect(result).toContain('JOIN');
      expect(result).toContain('users');
      expect(result).toContain('orders');
      expect(result).toContain('user_id');
    });

    it('should validate input schema', async () => {
      const invalidInput = {
        tables: [
          {
            name: 'users',
            // Missing columns
          }
        ],
        query: 'Find all users'
      };

      await expect(tool.execute(invalidInput)).rejects.toThrow();
    });

    it('should handle empty tables array', async () => {
      const input = {
        tables: [],
        query: 'Find all users'
      };

      await expect(tool.execute(input)).rejects.toThrow('No tables provided');
    });

    it('should handle empty query', async () => {
      const input = {
        ...validInput,
        query: ''
      };

      await expect(tool.execute(input)).rejects.toThrow('Query is required');
    });

    it('should handle invalid column types', async () => {
      const input = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INVALID_TYPE' }
            ]
          }
        ],
        query: 'Find all users'
      };

      await expect(tool.execute(input)).rejects.toThrow('Invalid column type');
    });

    it('should sanitize table and column names', async () => {
      const result = await tool.execute({
        tables: [
          {
            name: 'user-table',
            columns: [
              { name: 'user-id', type: 'INTEGER' },
              { name: 'user-name', type: 'TEXT' }
            ]
          }
        ],
        query: 'Find all users'
      });

      expect(result).toContain('`user-table`');
      expect(result).toContain('`user-id`');
      expect(result).toContain('`user-name`');
    });
  });
});
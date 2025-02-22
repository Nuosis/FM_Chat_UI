import { describe, it, expect, beforeEach } from 'vitest';
import mathTool from '../exampleTool';

describe('Math Operations Tool', () => {
  let tool;

  beforeEach(() => {
    tool = mathTool;
  });

  describe('Tool Definition', () => {
    it('should have required properties', () => {
      expect(tool.name).toBe('math_operations');
      expect(tool.description).toContain('math operations');
      expect(tool.parameters).toBeDefined();
    });

    it('should have valid parameters schema', () => {
      expect(tool.parameters).toEqual({
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: expect.any(String)
          },
          numbers: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            description: expect.any(String)
          }
        },
        required: ['operation', 'numbers']
      });
    });
  });

  describe('execute', () => {
    describe('add operation', () => {
      it('should add numbers correctly', async () => {
        const result = await tool.execute({
          operation: 'add',
          numbers: [1, 2, 3, 4, 5]
        });
        expect(result).toBe(15);
      });

      it('should handle negative numbers', async () => {
        const result = await tool.execute({
          operation: 'add',
          numbers: [-1, -2, 3]
        });
        expect(result).toBe(0);
      });
    });

    describe('subtract operation', () => {
      it('should subtract numbers correctly', async () => {
        const result = await tool.execute({
          operation: 'subtract',
          numbers: [10, 3, 2]
        });
        expect(result).toBe(5);
      });

      it('should handle negative numbers', async () => {
        const result = await tool.execute({
          operation: 'subtract',
          numbers: [0, -5, -3]
        });
        expect(result).toBe(8);
      });
    });

    describe('multiply operation', () => {
      it('should multiply numbers correctly', async () => {
        const result = await tool.execute({
          operation: 'multiply',
          numbers: [2, 3, 4]
        });
        expect(result).toBe(24);
      });

      it('should handle zero', async () => {
        const result = await tool.execute({
          operation: 'multiply',
          numbers: [5, 0, 3]
        });
        expect(result).toBe(0);
      });
    });

    describe('divide operation', () => {
      it('should divide numbers correctly', async () => {
        const result = await tool.execute({
          operation: 'divide',
          numbers: [12, 3, 2]
        });
        expect(result).toBe(2);
      });

      it('should handle decimal results', async () => {
        const result = await tool.execute({
          operation: 'divide',
          numbers: [10, 4]
        });
        expect(result).toBe(2.5);
      });
    });

    describe('error handling', () => {
      it('should handle missing operation', async () => {
        await expect(tool.execute({
          numbers: [1, 2, 3]
        })).rejects.toThrow();
      });

      it('should handle missing numbers', async () => {
        await expect(tool.execute({
          operation: 'add'
        })).rejects.toThrow();
      });

      it('should handle invalid operation', async () => {
        await expect(tool.execute({
          operation: 'power',
          numbers: [2, 3]
        })).rejects.toThrow('Unknown operation: power');
      });

      it('should handle less than 2 numbers', async () => {
        await expect(tool.execute({
          operation: 'add',
          numbers: [1]
        })).rejects.toThrow();
      });
    });

    describe('input validation', () => {
      it('should validate number array', async () => {
        await expect(tool.execute({
          operation: 'add',
          numbers: ['1', '2'] // should be numbers, not strings
        })).rejects.toThrow();
      });

      it('should handle null input', async () => {
        await expect(tool.execute(null)).rejects.toThrow();
      });

      it('should handle undefined input', async () => {
        await expect(tool.execute(undefined)).rejects.toThrow();
      });
    });
  });
});
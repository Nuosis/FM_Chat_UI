import { describe, it, expect, beforeEach } from 'vitest';
import { ExampleTool } from '../exampleTool';

describe('ExampleTool', () => {
  let tool;

  beforeEach(() => {
    tool = new ExampleTool();
  });

  describe('Tool Definition', () => {
    it('should have required properties', () => {
      expect(tool.name).toBe('example');
      expect(tool.description).toContain('example tool');
      expect(tool.schema).toBeDefined();
    });

    it('should have valid JSON schema', () => {
      expect(tool.schema).toEqual({
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to process'
          },
          operation: {
            type: 'string',
            enum: ['uppercase', 'lowercase', 'reverse'],
            description: 'Operation to perform on the text'
          }
        },
        required: ['text', 'operation']
      });
    });
  });

  describe('execute', () => {
    describe('uppercase operation', () => {
      it('should convert text to uppercase', async () => {
        const result = await tool.execute({
          text: 'hello world',
          operation: 'uppercase'
        });

        expect(result).toBe('HELLO WORLD');
      });

      it('should handle already uppercase text', async () => {
        const result = await tool.execute({
          text: 'HELLO WORLD',
          operation: 'uppercase'
        });

        expect(result).toBe('HELLO WORLD');
      });

      it('should handle mixed case text', async () => {
        const result = await tool.execute({
          text: 'HeLLo WoRLD',
          operation: 'uppercase'
        });

        expect(result).toBe('HELLO WORLD');
      });
    });

    describe('lowercase operation', () => {
      it('should convert text to lowercase', async () => {
        const result = await tool.execute({
          text: 'HELLO WORLD',
          operation: 'lowercase'
        });

        expect(result).toBe('hello world');
      });

      it('should handle already lowercase text', async () => {
        const result = await tool.execute({
          text: 'hello world',
          operation: 'lowercase'
        });

        expect(result).toBe('hello world');
      });

      it('should handle mixed case text', async () => {
        const result = await tool.execute({
          text: 'HeLLo WoRLD',
          operation: 'lowercase'
        });

        expect(result).toBe('hello world');
      });
    });

    describe('reverse operation', () => {
      it('should reverse text', async () => {
        const result = await tool.execute({
          text: 'hello world',
          operation: 'reverse'
        });

        expect(result).toBe('dlrow olleh');
      });

      it('should handle palindromes', async () => {
        const result = await tool.execute({
          text: 'racecar',
          operation: 'reverse'
        });

        expect(result).toBe('racecar');
      });

      it('should preserve spaces', async () => {
        const result = await tool.execute({
          text: 'hello  world',
          operation: 'reverse'
        });

        expect(result).toBe('dlrow  olleh');
      });

      it('should handle single character', async () => {
        const result = await tool.execute({
          text: 'a',
          operation: 'reverse'
        });

        expect(result).toBe('a');
      });
    });

    describe('error handling', () => {
      it('should handle missing text', async () => {
        await expect(tool.execute({
          operation: 'uppercase'
        })).rejects.toThrow('Text is required');
      });

      it('should handle missing operation', async () => {
        await expect(tool.execute({
          text: 'hello world'
        })).rejects.toThrow('Operation is required');
      });

      it('should handle invalid operation', async () => {
        await expect(tool.execute({
          text: 'hello world',
          operation: 'invalid'
        })).rejects.toThrow('Invalid operation');
      });

      it('should handle empty text', async () => {
        const result = await tool.execute({
          text: '',
          operation: 'uppercase'
        });

        expect(result).toBe('');
      });

      it('should handle whitespace text', async () => {
        const result = await tool.execute({
          text: '   ',
          operation: 'uppercase'
        });

        expect(result).toBe('   ');
      });

      it('should handle special characters', async () => {
        const result = await tool.execute({
          text: 'Hello! @World#',
          operation: 'uppercase'
        });

        expect(result).toBe('HELLO! @WORLD#');
      });
    });

    describe('input validation', () => {
      it('should validate input against schema', async () => {
        const invalidInput = {
          text: 123, // should be string
          operation: 'uppercase'
        };

        await expect(tool.execute(invalidInput)).rejects.toThrow();
      });

      it('should validate operation enum values', async () => {
        const invalidInput = {
          text: 'hello',
          operation: 'capitalize' // not in enum
        };

        await expect(tool.execute(invalidInput)).rejects.toThrow();
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
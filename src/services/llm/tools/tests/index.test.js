import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerTool, getRegisteredTools, clearTools } from '../index';
import { ExampleTool } from '../exampleTool';
import { SQLGeneratorTool } from '../SQLGeneratorTool';
import { FileMakerToolAdapter } from '../FileMakerToolAdapter';

// Mock the tools
vi.mock('../exampleTool', () => ({
  ExampleTool: class {
    name = 'example';
    description = 'Example tool';
    schema = {};
    execute = vi.fn();
  }
}));

vi.mock('../SQLGeneratorTool', () => ({
  SQLGeneratorTool: class {
    name = 'sqlGenerator';
    description = 'SQL Generator tool';
    schema = {};
    execute = vi.fn();
  }
}));

vi.mock('../FileMakerToolAdapter', () => ({
  FileMakerToolAdapter: class {
    name = 'filemaker';
    description = 'FileMaker tool';
    schema = {};
    execute = vi.fn();
  }
}));

describe('Tools Index', () => {
  beforeEach(() => {
    clearTools();
  });

  describe('registerTool', () => {
    it('should register a valid tool', () => {
      const tool = new ExampleTool();
      registerTool(tool);

      const tools = getRegisteredTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(tool);
    });

    it('should not register duplicate tools', () => {
      const tool = new ExampleTool();
      registerTool(tool);
      registerTool(tool);

      const tools = getRegisteredTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(tool);
    });

    it('should not register tools with duplicate names', () => {
      const tool1 = new ExampleTool();
      const tool2 = {
        name: 'example',
        description: 'Different tool, same name',
        schema: {},
        execute: () => {}
      };

      registerTool(tool1);
      expect(() => registerTool(tool2)).toThrow('Tool with name "example" already registered');
    });

    it('should validate tool structure', () => {
      const invalidTools = [
        { description: 'Missing name' },
        { name: 'test' },
        { name: 'test', description: 'Missing execute' },
        { name: 'test', execute: () => {} },
        { name: 'test', description: 'Missing schema', execute: () => {} }
      ];

      invalidTools.forEach(tool => {
        expect(() => registerTool(tool)).toThrow();
      });

      expect(getRegisteredTools()).toHaveLength(0);
    });

    it('should validate tool name format', () => {
      const invalidNames = [
        '',
        ' ',
        'Invalid Name',
        'invalid-name!',
        '123name'
      ];

      invalidNames.forEach(name => {
        const tool = {
          name,
          description: 'Test tool',
          schema: {},
          execute: () => {}
        };
        expect(() => registerTool(tool)).toThrow('Invalid tool name');
      });
    });
  });

  describe('getRegisteredTools', () => {
    it('should return empty array when no tools registered', () => {
      expect(getRegisteredTools()).toEqual([]);
    });

    it('should return all registered tools', () => {
      const tools = [
        new ExampleTool(),
        new SQLGeneratorTool(),
        new FileMakerToolAdapter()
      ];

      tools.forEach(tool => registerTool(tool));

      const registeredTools = getRegisteredTools();
      expect(registeredTools).toHaveLength(tools.length);
      tools.forEach(tool => {
        expect(registeredTools).toContain(tool);
      });
    });

    it('should return tools in registration order', () => {
      const tool1 = new ExampleTool();
      const tool2 = new SQLGeneratorTool();
      const tool3 = new FileMakerToolAdapter();

      registerTool(tool1);
      registerTool(tool2);
      registerTool(tool3);

      const tools = getRegisteredTools();
      expect(tools[0]).toBe(tool1);
      expect(tools[1]).toBe(tool2);
      expect(tools[2]).toBe(tool3);
    });

    it('should return a copy of the tools array', () => {
      const tool = new ExampleTool();
      registerTool(tool);

      const tools1 = getRegisteredTools();
      const tools2 = getRegisteredTools();

      expect(tools1).not.toBe(tools2);
      expect(tools1).toEqual(tools2);
    });
  });

  describe('clearTools', () => {
    it('should remove all registered tools', () => {
      const tools = [
        new ExampleTool(),
        new SQLGeneratorTool(),
        new FileMakerToolAdapter()
      ];

      tools.forEach(tool => registerTool(tool));
      expect(getRegisteredTools()).toHaveLength(tools.length);

      clearTools();
      expect(getRegisteredTools()).toHaveLength(0);
    });

    it('should allow registering tools after clearing', () => {
      const tool1 = new ExampleTool();
      registerTool(tool1);
      clearTools();

      const tool2 = new SQLGeneratorTool();
      registerTool(tool2);

      const tools = getRegisteredTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(tool2);
    });
  });

  describe('Tool Integration', () => {
    it('should maintain tool independence', async () => {
      const example = new ExampleTool();
      const sql = new SQLGeneratorTool();
      const filemaker = new FileMakerToolAdapter();

      registerTool(example);
      registerTool(sql);
      registerTool(filemaker);

      // Each tool should maintain its own state and functionality
      await example.execute({ text: 'test', operation: 'uppercase' });
      expect(example.execute).toHaveBeenCalled();
      expect(sql.execute).not.toHaveBeenCalled();
      expect(filemaker.execute).not.toHaveBeenCalled();
    });
  });
});
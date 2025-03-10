import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerTools } from '../index';
import exampleTool from '../exampleTool';
import sqlGeneratorTool from '../SQLGeneratorTool';
import agentExecutorTool from '../AgentExecutorTool';
import { FileMakerToolAdapter } from '../FileMakerToolAdapter';

// Define invalid tool for testing validation
const invalidTool = {
  // Missing required properties
};

// Mock the tools
vi.mock('../exampleTool', () => ({
  default: {
    name: 'math_operations',
    description: 'Math operations tool',
    parameters: {
      type: 'object',
      properties: {
        operation: { type: 'string' },
        numbers: { type: 'array' }
      }
    },
    execute: vi.fn()
  }
}));

vi.mock('../SQLGeneratorTool', () => ({
  default: {
    name: 'sql_generator',
    description: 'SQL Generator tool',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        schema: { type: 'object' }
      }
    },
    execute: vi.fn()
  }
}));

vi.mock('../AgentExecutorTool', () => ({
  default: {
    name: 'agent_executor',
    description: 'Agent executor tool',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string' },
        agentName: { type: 'string' }
      }
    },
    execute: vi.fn()
  }
}));

vi.mock('../FileMakerToolAdapter', () => ({
  FileMakerToolAdapter: vi.fn().mockImplementation(() => ({
    registerTools: vi.fn().mockResolvedValue([]),
    executeTool: vi.fn()
  }))
}));

// Mock inFileMaker
vi.mock('../../../utils/filemaker', () => ({
  inFileMaker: false
}));

describe('Tools Index', () => {
  let mockService;

  beforeEach(() => {
    mockService = {
      registerTool: vi.fn()
    };
    vi.clearAllMocks();
  });

  describe('registerTools', () => {
    it('should register local tools', async () => {
      const result = await registerTools(mockService);

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(3); // exampleTool, sqlGeneratorTool, and agentExecutorTool
      expect(mockService.registerTool).toHaveBeenCalledTimes(3);
      expect(mockService.registerTool).toHaveBeenCalledWith(exampleTool);
      expect(mockService.registerTool).toHaveBeenCalledWith(sqlGeneratorTool);
      expect(mockService.registerTool).toHaveBeenCalledWith(agentExecutorTool);
    });

    it('should handle tool registration errors', async () => {
      mockService.registerTool.mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      const result = await registerTools(mockService);

      expect(result.success).toBe(true); // Still succeeds as some tools registered
      expect(result.toolCount).toBe(3); // All three tools still counted
    });

    it('should not register FileMaker tools when not in FileMaker', async () => {
      const result = await registerTools(mockService);

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(3); // Only local tools (3 of them)
      expect(mockService.registerTool).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'filemaker' })
      );
    });

    it('should validate tool structure before registration', async () => {
      // Temporarily replace the exampleTool with an invalid tool
      const originalTool = exampleTool;
      exampleTool = {
        // Missing required properties
      };

      const result = await registerTools(mockService);

      expect(result.success).toBe(true); // Still succeeds as some tools registered
      expect(mockService.registerTool).toHaveBeenCalledTimes(2); // Two valid tools registered (sqlGeneratorTool and agentExecutorTool)
      expect(mockService.registerTool).toHaveBeenCalledWith(sqlGeneratorTool); // Verify sqlGeneratorTool registered
      expect(mockService.registerTool).toHaveBeenCalledWith(agentExecutorTool); // Verify agentExecutorTool registered

      // Restore the original tool
      exampleTool = originalTool;
    });
  });
});
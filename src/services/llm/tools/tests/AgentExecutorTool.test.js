import agentExecutorTool from '../AgentExecutorTool';
import { AgentManager } from '../../agents/AgentManager';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock the agents module
vi.mock('../../agents', () => ({
  createAgentManager: vi.fn().mockImplementation(() => mockAgentManager)
}));

// Mock agent manager
const mockAgentManager = {
  createAgent: vi.fn().mockReturnValue({
    name: 'test_agent',
    role: 'Test role',
    tools: ['tool1', 'tool2'],
    initialize: vi.fn().mockResolvedValue(undefined)
  }),
  executeTask: vi.fn().mockResolvedValue({ content: 'Task result' }),
  addFeedback: vi.fn()
};

describe('AgentExecutorTool', () => {
  let mockContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock context
    mockContext = {
      llmService: {
        getTools: vi.fn().mockReturnValue([
          { name: 'tool1', description: 'Tool 1 description' },
          { name: 'tool2', description: 'Tool 2 description' }
        ])
      }
    };
  });

  test('should have the correct properties', () => {
    expect(agentExecutorTool.name).toBe('agent_executor');
    expect(agentExecutorTool.description).toBeDefined();
    expect(agentExecutorTool.parameters).toBeDefined();
    expect(agentExecutorTool.execute).toBeDefined();
  });

  test('should create an agent', async () => {
    const args = {
      action: 'create',
      agentName: 'test_agent',
      agentRole: 'Test role',
      tools: ['tool1', 'tool2'],
      outputSchema: { type: 'object' }
    };

    const result = await agentExecutorTool.execute(args, mockContext);

    expect(mockAgentManager.createAgent).toHaveBeenCalledWith({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2'],
      outputSchema: { type: 'object' }
    });

    expect(result).toEqual({
      success: true,
      message: 'Agent test_agent created successfully',
      agent: {
        name: 'test_agent',
        role: 'Test role',
        tools: ['tool1', 'tool2']
      }
    });
  });

  test('should throw an error if agentRole is not provided for create action', async () => {
    const args = {
      action: 'create',
      agentName: 'test_agent'
    };

    await expect(agentExecutorTool.execute(args, mockContext)).rejects.toThrow('agentRole is required for create action');
  });

  test('should execute a task with an agent', async () => {
    const args = {
      action: 'execute',
      agentName: 'test_agent',
      task: 'Test task'
    };

    const result = await agentExecutorTool.execute(args, mockContext);

    expect(mockAgentManager.executeTask).toHaveBeenCalledWith('test_agent', 'Test task');
    expect(result).toEqual({
      success: true,
      result: { content: 'Task result' }
    });
  });

  test('should throw an error if task is not provided for execute action', async () => {
    const args = {
      action: 'execute',
      agentName: 'test_agent'
    };

    await expect(agentExecutorTool.execute(args, mockContext)).rejects.toThrow('task is required for execute action');
  });

  test('should add feedback for an agent', async () => {
    const args = {
      action: 'feedback',
      agentName: 'test_agent',
      feedback: 'Test feedback'
    };

    const result = await agentExecutorTool.execute(args, mockContext);

    expect(mockAgentManager.addFeedback).toHaveBeenCalledWith('test_agent', 'Test feedback');
    expect(result).toEqual({
      success: true,
      message: 'Feedback added for agent test_agent'
    });
  });

  test('should throw an error if feedback is not provided for feedback action', async () => {
    const args = {
      action: 'feedback',
      agentName: 'test_agent'
    };

    await expect(agentExecutorTool.execute(args, mockContext)).rejects.toThrow('feedback is required for feedback action');
  });

  test('should throw an error for unknown action', async () => {
    const args = {
      action: 'unknown',
      agentName: 'test_agent'
    };

    await expect(agentExecutorTool.execute(args, mockContext)).rejects.toThrow('Unknown action: unknown');
  });

  test('should throw an error if LLM service is not available in context', async () => {
    const args = {
      action: 'create',
      agentName: 'test_agent',
      agentRole: 'Test role'
    };

    await expect(agentExecutorTool.execute(args, {})).rejects.toThrow('LLM service not available in context');
  });
  test('should reuse existing agent manager if available in context', async () => {
    const existingAgentManager = {
      createAgent: vi.fn().mockReturnValue({
        name: 'test_agent',
        role: 'Test role',
        tools: ['tool1', 'tool2'],
        initialize: vi.fn().mockResolvedValue(undefined)
      })
    };

    mockContext.agentManager = existingAgentManager;

    const args = {
      action: 'create',
      agentName: 'test_agent',
      agentRole: 'Test role',
      tools: ['tool1', 'tool2']
    };

    await agentExecutorTool.execute(args, mockContext);

    expect(existingAgentManager.createAgent).toHaveBeenCalled();
  });
});
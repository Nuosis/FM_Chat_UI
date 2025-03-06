import { AgentManager } from '../AgentManager';
import { Agent } from '../Agent';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock the Agent class
vi.mock('../Agent');

describe('AgentManager', () => {
  let mockLLMService;
  let agentManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Agent implementation
    Agent.mockImplementation((config) => ({
      name: config.name,
      role: config.role,
      tools: config.tools || [],
      outputSchema: config.outputSchema,
      llmService: config.llmService,
      initialize: vi.fn().mockResolvedValue(undefined),
      executeTask: vi.fn().mockResolvedValue({ content: 'Task result' }),
      addFeedback: vi.fn()
    }));

    // Mock LLM service
    mockLLMService = {
      getTools: vi.fn().mockReturnValue([
        { name: 'tool1', description: 'Tool 1 description' },
        { name: 'tool2', description: 'Tool 2 description' }
      ])
    };

    // Create agent manager
    agentManager = new AgentManager(mockLLMService);
  });

  test('should create an agent manager with the correct properties', () => {
    expect(agentManager.llmService).toBe(mockLLMService);
    expect(agentManager.agents).toEqual({});
  });

  test('should create an agent', () => {
    const agent = agentManager.createAgent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2']
    });

    expect(Agent).toHaveBeenCalledWith({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2'],
      llmService: mockLLMService
    });

    expect(agentManager.agents.test_agent).toBe(agent);
  });

  test('should throw an error if agent name is not provided', () => {
    expect(() => {
      agentManager.createAgent({
        role: 'Test role',
        tools: ['tool1', 'tool2']
      });
    }).toThrow('Agent name is required');
  });

  test('should throw an error if agent already exists', () => {
    agentManager.createAgent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2']
    });

    expect(() => {
      agentManager.createAgent({
        name: 'test_agent',
        role: 'Another role',
        tools: ['tool1']
      });
    }).toThrow('Agent with name test_agent already exists');
  });

  test('should get an agent by name', () => {
    const agent = agentManager.createAgent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2']
    });

    expect(agentManager.getAgent('test_agent')).toBe(agent);
  });

  test('should throw an error if agent is not found', () => {
    expect(() => {
      agentManager.getAgent('nonexistent_agent');
    }).toThrow('Agent not found: nonexistent_agent');
  });

  test('should initialize all agents', async () => {
    const agent1 = agentManager.createAgent({
      name: 'agent1',
      role: 'Role 1',
      tools: ['tool1']
    });

    const agent2 = agentManager.createAgent({
      name: 'agent2',
      role: 'Role 2',
      tools: ['tool2']
    });

    await agentManager.initializeAgents();

    expect(agent1.initialize).toHaveBeenCalled();
    expect(agent2.initialize).toHaveBeenCalled();
  });

  test('should execute a task with an agent', async () => {
    const agent = agentManager.createAgent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2']
    });

    const onUpdate = vi.fn();
    const result = await agentManager.executeTask('test_agent', 'Test task', { option: 'value' }, onUpdate);

    expect(agent.executeTask).toHaveBeenCalledWith('Test task', { option: 'value' }, onUpdate);
    expect(result).toEqual({ content: 'Task result' });
  });

  test('should add feedback for an agent', () => {
    const agent = agentManager.createAgent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2']
    });

    agentManager.addFeedback('test_agent', 'Test feedback');

    expect(agent.addFeedback).toHaveBeenCalledWith('Test feedback');
  });

  test('should get all agents', () => {
    const agent1 = agentManager.createAgent({
      name: 'agent1',
      role: 'Role 1',
      tools: ['tool1']
    });

    const agent2 = agentManager.createAgent({
      name: 'agent2',
      role: 'Role 2',
      tools: ['tool2']
    });

    const agents = agentManager.getAgents();

    expect(agents).toEqual({
      agent1,
      agent2
    });
  });

  test('should remove an agent', () => {
    agentManager.createAgent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2']
    });

    agentManager.removeAgent('test_agent');

    expect(agentManager.agents.test_agent).toBeUndefined();
  });

  test('should throw an error if agent to remove is not found', () => {
    expect(() => {
      agentManager.removeAgent('nonexistent_agent');
    }).toThrow('Agent not found: nonexistent_agent');
  });
});
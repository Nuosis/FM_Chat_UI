import { Agent } from '../Agent';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Add a console log to validate our diagnosis
console.log('Using Vitest for mocking');

describe('Agent', () => {
  let mockLLMService;
  let agent;

  beforeEach(() => {
    // Mock LLM service
    mockLLMService = {
      getTools: vi.fn().mockReturnValue([
        { name: 'tool1', description: 'Tool 1 description' },
        { name: 'tool2', description: 'Tool 2 description' }
      ]),
      sendMessage: vi.fn().mockResolvedValue({
        content: 'Test response'
      })
    };

    // Create agent
    agent = new Agent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2'],
      llmService: mockLLMService
    });
  });

  test('should create an agent with the correct properties', () => {
    expect(agent.name).toBe('test_agent');
    expect(agent.role).toBe('Test role');
    expect(agent.tools).toEqual(['tool1', 'tool2']);
    expect(agent.llmService).toBe(mockLLMService);
    expect(agent.history).toEqual([]);
    expect(agent.feedback).toEqual([]);
  });

  test('should initialize successfully', async () => {
    await expect(agent.initialize()).resolves.not.toThrow();
  });

  test('should throw an error if a tool is not found', async () => {
    agent = new Agent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'nonexistent_tool'],
      llmService: mockLLMService
    });

    await expect(agent.initialize()).rejects.toThrow('Tool not found: nonexistent_tool');
  });

  test('should execute a task and return the response', async () => {
    const result = await agent.executeTask('Test task');

    expect(mockLLMService.sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Test role')
        }),
        expect.objectContaining({
          role: 'user',
          content: 'Test task'
        })
      ]),
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: 'tool1' }),
          expect.objectContaining({ name: 'tool2' })
        ])
      }),
      null
    );

    expect(result).toEqual({ content: 'Test response' });
    expect(agent.history).toHaveLength(2);
  });

  test('should parse structured output', async () => {
    // Mock LLM service to return JSON response
    mockLLMService.sendMessage.mockResolvedValue({
      content: '```json\n{"key": "value"}\n```'
    });

    // Create agent with output schema
    agent = new Agent({
      name: 'test_agent',
      role: 'Test role',
      tools: ['tool1', 'tool2'],
      outputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' }
        }
      },
      llmService: mockLLMService
    });

    const result = await agent.executeTask('Test task');

    expect(result).toEqual({ key: 'value' });
  });

  test('should add feedback', () => {
    agent.addFeedback('Test feedback');

    expect(agent.feedback).toHaveLength(1);
    expect(agent.feedback[0].feedback).toBe('Test feedback');
    expect(agent.feedback[0].timestamp).toBeDefined();
  });

  test('should clear history', () => {
    agent.history = [{ role: 'user', content: 'Test' }];
    agent.clearHistory();

    expect(agent.history).toEqual([]);
  });
});
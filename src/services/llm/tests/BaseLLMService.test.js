import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseLLMService } from '../BaseLLMService';

// Mock the store and createLog imports
vi.mock('../../redux/store', () => ({
  store: {
    dispatch: vi.fn()
  }
}));

vi.mock('../../redux/slices/appSlice', () => ({
  createLog: (message, level) => ({
    type: 'LOG',
    payload: { message, level }
  })
}));

class TestLLMService extends BaseLLMService {
  constructor() {
    super('test');
    this.initialized = false;
  }

  initialize(apiKey = '') {
    this.initialized = true;
    this.config = { models: ['model1', 'model2'] };
  }

  async getModels() {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
    return this.config.models;
  }

  async sendMessage(messages, options, onProgress) {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
    
    if (onProgress) {
      onProgress('Processing...');
    }
    
    return { content: 'Test response' };
  }

  async fetchModels() {
    return ['model1', 'model2'];
  }

  formatAndSendRequest(messages, options) {
    return { data: { content: 'Test response' } };
  }

  parseResponse(response) {
    return { content: response.data.content };
  }
}

describe('BaseLLMService', () => {
  let service;

  beforeEach(() => {
    service = new TestLLMService();
    vi.clearAllMocks();
  });

  it('should initialize with empty tools', () => {
    expect(service.getTools()).toEqual([]);
  });

  it('should register and retrieve tools', () => {
    const tool1 = {
      name: 'tool1',
      description: 'Tool 1 description',
      execute: vi.fn()
    };
    const tool2 = {
      name: 'tool2',
      description: 'Tool 2 description',
      execute: vi.fn()
    };

    service.registerTool(tool1);
    service.registerTool(tool2);

    const tools = service.getTools();
    expect(tools).toHaveLength(2);
    expect(tools).toContainEqual({
      name: 'tool1',
      description: 'Tool 1 description'
    });
    expect(tools).toContainEqual({
      name: 'tool2',
      description: 'Tool 2 description'
    });
  });

  it('should not register duplicate tools', () => {
    const tool = {
      name: 'tool1',
      description: 'Tool 1 description',
      execute: vi.fn()
    };

    service.registerTool(tool);
    service.registerTool(tool);

    const tools = service.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      name: 'tool1',
      description: 'Tool 1 description'
    });
  });

  it('should validate tool structure when registering', () => {
    const invalidTool1 = { name: 'tool1' }; // missing execute
    const invalidTool2 = { execute: vi.fn() }; // missing name

    expect(() => service.registerTool(invalidTool1)).toThrow();
    expect(() => service.registerTool(invalidTool2)).toThrow();
    expect(service.getTools()).toHaveLength(0);
  });

  it('should require subclasses to implement required methods', async () => {
    class IncompleteService extends BaseLLMService {
      constructor() {
        super('incomplete');
      }
    }
    const incompleteService = new IncompleteService();

    expect(() => incompleteService.formatAndSendRequest([])).toThrow();
    expect(() => incompleteService.parseResponse({})).toThrow();
    await expect(incompleteService.fetchModels()).rejects.toThrow('fetchModels must be implemented by provider');
  });

  it('should handle progress callbacks in sendMessage', async () => {
    const progressCallback = vi.fn();
    service.initialized = true;
    await service.sendMessage([], {}, progressCallback);
    expect(progressCallback).toHaveBeenCalledWith('Processing...');
  });

  it('should handle messages without progress callback', async () => {
    service.initialize('test-key');
    const response = await service.sendMessage([]);
    expect(response).toEqual({ content: 'Test response' });
  });

  it('should throw error when not initialized', async () => {
    const uninitializedService = new TestLLMService();
    await expect(uninitializedService.getModels()).rejects.toThrow('Service not initialized');
    await expect(uninitializedService.sendMessage([])).rejects.toThrow('Service not initialized');
  });

  it('should execute tool successfully', async () => {
    const tool = {
      name: 'testTool',
      execute: vi.fn().mockResolvedValue('Tool result'),
    };
    service.registerTool(tool);

    const toolCall = {
      id: '1',
      function: {
        name: 'testTool',
        arguments: '{"param": "value"}'
      }
    };

    const result = await service.executeTool(toolCall);
    expect(result).toBe('Tool result');
    expect(tool.execute).toHaveBeenCalledWith({ param: 'value' });
  });

  it('should handle tool execution errors', async () => {
    const tool = {
      name: 'failingTool',
      execute: vi.fn().mockRejectedValue(new Error('Tool failed'))
    };
    service.registerTool(tool);

    const toolCall = {
      id: '1',
      function: {
        name: 'failingTool',
        arguments: '{}'
      }
    };

    await expect(service.executeTool(toolCall)).rejects.toThrow('Error executing tool failingTool');
  });

  it('should handle tool calls with progress updates', async () => {
    service.initialize('test-key');
    const progressCallback = vi.fn();
    const tool = {
      name: 'testTool',
      execute: vi.fn().mockResolvedValue('Tool result'),
      progressText: 'Tool in progress'
    };
    service.registerTool(tool);

    const response = {
      tool_calls: [{
        id: '1',
        function: {
          name: 'testTool',
          arguments: '{}'
        }
      }]
    };

    const result = await service.handleToolCalls(response, [], {}, progressCallback);
    expect(progressCallback).toHaveBeenCalledWith('Tool in progress');
    expect(progressCallback).toHaveBeenCalledWith(null); // Clear progress
  });

  it('should cache models after first fetch', async () => {
    service.initialize('test-key');
    const fetchModelsSpy = vi.spyOn(service, 'fetchModels');
    
    const firstResult = await service.getModels();
    const secondResult = await service.getModels();
    
    expect(firstResult).toEqual(['model1', 'model2']);
    expect(secondResult).toEqual(['model1', 'model2']);
    expect(fetchModelsSpy).toHaveBeenCalledTimes(0); // Because models are in config
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseLLMService } from '../BaseLLMService';

class TestLLMService extends BaseLLMService {
  async getModels() {
    return ['test-model-1', 'test-model-2'];
  }

  async sendMessage(messages, options, onProgress) {
    if (onProgress) {
      onProgress('Processing...');
    }
    return { content: 'Test response' };
  }
}

describe('BaseLLMService', () => {
  let service;

  beforeEach(() => {
    service = new TestLLMService();
  });

  it('should initialize with empty tools', () => {
    expect(service.getTools()).toEqual([]);
  });

  it('should register and retrieve tools', () => {
    const tool1 = { name: 'tool1', description: 'Tool 1 description' };
    const tool2 = { name: 'tool2', description: 'Tool 2 description' };

    service.registerTool(tool1);
    service.registerTool(tool2);

    const tools = service.getTools();
    expect(tools).toHaveLength(2);
    expect(tools).toContainEqual(tool1);
    expect(tools).toContainEqual(tool2);
  });

  it('should not register duplicate tools', () => {
    const tool = { name: 'tool1', description: 'Tool 1 description' };

    service.registerTool(tool);
    service.registerTool(tool);

    const tools = service.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual(tool);
  });

  it('should validate tool structure when registering', () => {
    const invalidTool1 = { name: 'tool1' }; // missing description
    const invalidTool2 = { description: 'Tool 2 description' }; // missing name

    expect(() => service.registerTool(invalidTool1)).toThrow();
    expect(() => service.registerTool(invalidTool2)).toThrow();
    expect(service.getTools()).toHaveLength(0);
  });

  it('should require subclasses to implement getModels', () => {
    class IncompleteService extends BaseLLMService {}
    const incompleteService = new IncompleteService();

    expect(() => incompleteService.getModels()).rejects.toThrow();
  });

  it('should require subclasses to implement sendMessage', () => {
    class IncompleteService extends BaseLLMService {}
    const incompleteService = new IncompleteService();

    expect(() => incompleteService.sendMessage([])).rejects.toThrow();
  });

  it('should handle progress callbacks in sendMessage', async () => {
    const progressCallback = vi.fn();
    await service.sendMessage([], {}, progressCallback);
    expect(progressCallback).toHaveBeenCalledWith('Processing...');
  });

  it('should handle messages without progress callback', async () => {
    const response = await service.sendMessage([]);
    expect(response).toEqual({ content: 'Test response' });
  });
});
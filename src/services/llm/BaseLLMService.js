import createLLMInstance from './axiosLLM';
import { getProviderEndpoint } from '../../../utils/providerEndpoints';
import { store } from '../../redux/store';
import { createLog } from '../../redux/slices/appSlice';

export class BaseLLMService {
  constructor(provider) {
    this.provider = provider;
    this.axios = null;
    this.models = null;
    this.toolsRegistry = {};
  }

  initialize(apiKey = '') {
    const config = getProviderEndpoint(this.provider, apiKey);
    if (!config) {
      throw new Error(`Invalid provider: ${this.provider}`);
    }
    this.axios = createLLMInstance();
    this.config = config;
  }

  async getModels() {
    if (!this.axios || !this.config) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    if (this.config.models) {
      return this.config.models;
    }

    try {
      store.dispatch(createLog(`Fetching models from ${this.provider}`, 'debug'));
      return await this.fetchModels();
    } catch (error) {
      store.dispatch(createLog(`Error fetching models from ${this.provider}: ${error.message}`, 'error'));
      throw error;
    }
  }

  async fetchModels() {
    throw new Error('fetchModels must be implemented by provider');
  }

  async sendMessage(messages, options = {}, onUpdate = null) {
    if (!this.axios || !this.config) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
    
    try {
      store.dispatch(createLog(`Sending message to ${this.provider}`, 'debug'));
      const response = await this.formatAndSendRequest(messages, options);
      const parsedResponse = this.parseResponse(response);
      
      // Handle tool calls if present
      if (parsedResponse.tool_calls) {
        return await this.handleToolCalls(parsedResponse, messages, options, onUpdate);
      }
      
      return parsedResponse;
    } catch (error) {
      store.dispatch(createLog(`Error in ${this.provider} service: ${error.message}`, 'error'));
      throw error;
    }
  }

  async handleToolCalls(response, messages, options, onUpdate) {
    const toolResults = [];
    
    for (const toolCall of response.tool_calls) {
      try {
        const tool = this.toolsRegistry[toolCall.function.name];
        if (tool?.progressText && typeof onUpdate === 'function') {
          onUpdate(tool.progressText);
        }
        
        const result = await this.executeTool(toolCall);
        toolResults.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result
        });
      } catch (error) {
        store.dispatch(createLog(`Error executing tool ${toolCall.function.name}: ${error.message}`, 'error'));
        toolResults.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: `Error: ${error.message}`
        });
      } finally {
        if (typeof onUpdate === 'function') {
          onUpdate(null); // Clear progress text
        }
      }
    }
    
    // Add tool results to messages and send follow-up
    const newMessages = [
      ...messages,
      {
        role: 'assistant',
        content: null,
        tool_calls: response.tool_calls
      },
      {
        role: 'tool',
        content: JSON.stringify(toolResults)
      }
    ];
    
    return this.sendMessage(newMessages, options, onUpdate);
  }

  async executeTool(toolCall) {
    const tool = this.toolsRegistry[toolCall.function.name];
    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.function.name}`);
    }
    
    try {
      const args = JSON.parse(toolCall.function.arguments);
      return await tool.execute(args);
    } catch (error) {
      throw new Error(`Error executing tool ${toolCall.function.name}: ${error.message}`);
    }
  }

  registerTool(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error('Tool must have name and execute method');
    }
    this.toolsRegistry[tool.name] = tool;
  }

  formatAndSendRequest(messages, options) {
    throw new Error('formatAndSendRequest must be implemented by provider');
  }

  parseResponse(response) {
    throw new Error('parseResponse must be implemented by provider');
  }
}
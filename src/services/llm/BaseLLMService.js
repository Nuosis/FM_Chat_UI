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
    this.axios = createLLMInstance({
      baseURL: config.endpoint
    });
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
    
    store.dispatch(createLog({
      message: `Handling tool calls: ${JSON.stringify(response.tool_calls, null, 2)}`,
      type: 'debug'
    }));
    
    for (const toolCall of response.tool_calls) {
      try {
        const tool = this.toolsRegistry[toolCall.function.name];
        if (tool?.progressText && typeof onUpdate === 'function') {
          onUpdate(tool.progressText);
        }
        
        store.dispatch(createLog({
          message: `Executing tool ${toolCall.function.name} with args: ${toolCall.function.arguments}`,
          type: 'debug'
        }));
        
        const result = await this.executeTool(toolCall);
        
        store.dispatch(createLog({
          message: `Tool ${toolCall.function.name} result: ${JSON.stringify(result, null, 2)}`,
          type: 'debug'
        }));
        
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
    
    // Create new messages array with only the relevant context
    const newMessages = [
      // Include the last user message and assistant response with tool calls
      messages[messages.length - 1], // Last user message
      {
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls || []
      },
      ...toolResults.map(result => ({
        role: 'tool',
        content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
        tool_call_id: result.tool_call_id
      }))
    ];
    
    store.dispatch(createLog({
      message: `Sending follow-up message with tool results: ${JSON.stringify(newMessages, null, 2)}`,
      type: 'debug'
    }));
    
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

  /**
   * Returns an array of registered tools with their names and descriptions
   * @returns {Array<{name: string, description: string}>}
   */
  getTools() {
    return Object.keys(this.toolsRegistry).map(name => {
      const tool = this.toolsRegistry[name];
      return {
        name,
        description: tool.description || '',
        parameters: {
          type: 'object',
          properties: tool.parameters?.properties || {},
          required: tool.parameters?.required || []
        }
      };
    });
  }
}
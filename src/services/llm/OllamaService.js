import { BaseLLMService } from './BaseLLMService';
import { getProviderEndpoint } from '../../../utils/providerEndpoints';
import createLLMInstance from './axiosLLM';

export class OllamaService extends BaseLLMService {
  constructor() {
    super('OLLAMA');
  }

  // Override initialize since Ollama doesn't need an API key
  initialize() {
    const config = getProviderEndpoint('OLLAMA');
    if (!config) {
      throw new Error('Invalid provider: OLLAMA');
    }
    this.axios = createLLMInstance({
      baseURL: config.endpoint,
      headers: config.headers
    });
    this.config = config;
  }

  async fetchModels() {
    const response = await this.axios.get(this.config.modelsEndpoint);
    return response.data.models.map(model => model.name);
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = 'llama3.1:70b', temperature = 0.7 } = options;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
    }));

    // Format tools for the request
    const tools = Object.values(this.toolsRegistry).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      options: {
        temperature,
        top_p: 0.9
      },
      stream: false,
      ...(tools.length > 0 && { tools })
    };

    const response = await this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );

    return response.data;
  }

  parseResponse(response) {
    if (!response || !response.message) {
      throw new Error('Invalid response from Ollama');
    }

    // Handle tool calls if present
    const toolCalls = response.message.tool_calls || [];
    const content = response.message.content || '';

    return {
      content,
      role: 'assistant',
      provider: this.provider,
      tool_calls: toolCalls,
      raw: response
    };
  }
}

// Singleton instance
const ollamaService = new OllamaService();
export default ollamaService;
import { BaseLLMService } from './BaseLLMService';

export class DeepseekService extends BaseLLMService {
  constructor() {
    super('DEEPSEEK');
  }

  initialize() {
    super.initialize();
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = 'deepseek-chat', temperature = 0.7 } = options;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls })
    }));

    // Get registered tools and format them
    const registeredTools = Object.values(this.toolsRegistry).map(tool => ({
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
      temperature,
      ...(registeredTools.length > 0 && { tools: registeredTools }),
      tool_choice: registeredTools.length > 0 ? 'auto' : undefined
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  parseResponse(response) {
    const { choices } = response.data;
    if (!choices || choices.length === 0) {
      throw new Error('No response from Deepseek');
    }

    const message = choices[0].message;
    return {
      content: message.content,
      role: message.role,
      provider: this.provider,
      tool_calls: message.tool_calls || [],
      raw: response.data
    };
  }
}

// Singleton instance
const deepseekService = new DeepseekService();
export default deepseekService;
import { BaseLLMService } from './BaseLLMService';

export class DeepseekService extends BaseLLMService {
  constructor() {
    super('DEEPSEEK');
  }

  initialize(apiKey = '') {
    super.initialize(apiKey);
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = 'deepseek-chat', temperature = 0.7 } = options;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      temperature
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
      tool_calls: [],
      raw: response.data
    };
  }
}

// Singleton instance
const deepseekService = new DeepseekService();
export default deepseekService;
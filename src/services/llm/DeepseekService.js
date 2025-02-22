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

    return {
      content: choices[0].message.content,
      role: choices[0].message.role,
      provider: this.provider,
      raw: response.data
    };
  }
}

// Singleton instance
const deepseekService = new DeepseekService();
export default deepseekService;
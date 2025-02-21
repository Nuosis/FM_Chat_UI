import { BaseLLMService } from './BaseLLMService';

export class DeepseekService extends BaseLLMService {
  constructor() {
    super('DEEPSEEK');
    this.lastContent = '';
  }

  initialize() {
    super.initialize();
    this.lastContent = '';
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
      stream: false,
      temperature
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  async formatAndSendStreamingRequest(messages, options = {}, onUpdate) {
    const { model = 'deepseek-chat', temperature = 0.7 } = options;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      stream: true,
      temperature
    };

    const response = await this.axios.post(
      this.config.endpoint,
      requestData,
      {
        headers: {
          ...this.config.headers,
          'Accept': 'text/event-stream',
        },
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const chunk = progressEvent.event.target.responseText;
          if (!chunk) return;

          // Split the chunk into lines and process each SSE event
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                const content = json.choices[0]?.delta?.content;
                if (content) {
                  // Only send new content
                  if (this.lastContent && content.startsWith(this.lastContent)) {
                    const newContent = content.slice(this.lastContent.length);
                    if (newContent) {
                      onUpdate(newContent);
                    }
                  } else {
                    onUpdate(content);
                  }
                  this.lastContent = content;
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    );

    // Reset state and return final response format
    const finalContent = this.lastContent;
    this.lastContent = '';
    
    return {
      content: finalContent,
      role: 'assistant',
      provider: this.provider,
      raw: response.data
    };
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
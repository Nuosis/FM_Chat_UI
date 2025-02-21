import { BaseLLMService } from './BaseLLMService';
import { getProviderEndpoint } from '../../../utils/providerEndpoints';
import createLLMInstance from './axiosLLM';

export class OllamaService extends BaseLLMService {
  constructor() {
    super('OLLAMA');
    this.lastContent = '';
  }

  // Override initialize since Ollama doesn't need an API key
  initialize() {
    const config = getProviderEndpoint('OLLAMA');
    if (!config) {
      throw new Error('Invalid provider: OLLAMA');
    }
    this.axios = createLLMInstance();
    this.config = config;
    this.lastContent = '';
  }

  async fetchModels() {
    const response = await this.axios.get(this.config.modelsEndpoint);
    return response.data.models.map(model => model.name);
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = 'llama2', temperature = 0.7 } = options;

    // Convert chat history to Ollama format
    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      stream: false,
      options: {
        temperature,
        top_p: 0.9
      }
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  async formatAndSendStreamingRequest(messages, options = {}, onUpdate, onError) {
    const { model = 'llama2', temperature = 0.7 } = options;

    // Convert chat history to Ollama format
    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      stream: true,
      options: {
        temperature,
        top_p: 0.9
      }
    };

    let buffer = '';
    
    try {
      const response = await this.axios.post(
        this.config.endpoint,
        requestData,
        {
          headers: this.config.headers,
          responseType: 'stream',
          onDownloadProgress: (progressEvent) => {
            const chunk = progressEvent.event.target.responseText;
            if (!chunk) return;

            buffer += chunk;
            
            // Process complete JSON objects
            while (true) {
              const newlineIndex = buffer.indexOf('\n');
              if (newlineIndex === -1) break;
              
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              
              if (!line) continue;
              
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  onUpdate(json.message.content);
                }
              } catch (e) {
                console.error('Error parsing Ollama response:', e);
              }
            }
          }
        }
      );

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.message?.content) {
            onUpdate(json.message.content);
          }
        } catch (e) {
          console.error('Error parsing final Ollama response:', e);
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      
      // Clean up any resources
      this.lastContent = '';
      buffer = '';
      
      // Create a more informative error
      const errorMessage = error.response ?
        `Ollama API Error: ${error.response.status} - ${error.response.statusText}` :
        `Network Error: ${error.message}`;
        
      const formattedError = new Error(errorMessage);
      formattedError.isNetworkError = !error.response;
      formattedError.statusCode = error.response?.status;
      
      if (onError) {
        onError(formattedError);
      }
      
      throw formattedError;
    }

    // Reset state after streaming is complete
    const finalContent = this.lastContent;
    this.lastContent = '';

    // Return final response format
    return {
      content: finalContent,
      role: 'assistant',
      provider: this.provider,
      raw: {
        message: {
          content: finalContent,
          role: 'assistant'
        }
      }
    };
  }

  parseResponse(finalContent) {
    if (!finalContent) {
      throw new Error('No response from Ollama');
    }

    return {
      content: finalContent,
      role: 'assistant',
      provider: this.provider,
      raw: { message: { content: finalContent, role: 'assistant' } }
    };
  }
}

// Singleton instance
const ollamaService = new OllamaService();
export default ollamaService;
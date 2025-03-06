import openAIService from './OpenAIService';
import anthropicService from './AnthropicService';
import deepseekService from './DeepseekService';
import ollamaService from './OllamaService';
import geminiService from './GeminiService';
import { store } from '../../redux/store';
import { createLog } from '../../redux/slices/appSlice';

class LLMServiceFactory {
  constructor() {
    this.services = {
      openai: openAIService,
      anthropic: anthropicService,
      deepseek: deepseekService,
      gemini: geminiService,
      ollama: ollamaService
    };
    
    this.initialized = {};
  }

  getService(provider = import.meta.env.VITE_DEFAULT_PROVIDER) {
    const normalizedProvider = provider.toLowerCase();
    const service = this.services[normalizedProvider];
    
    if (!service) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return service;
  }

  async initializeService(provider, apiKey = '') {
    const normalizedProvider = provider.toLowerCase();
    
    try {
      const service = this.getService(normalizedProvider);
      
      // Special case for Ollama which doesn't need an API key
      if (normalizedProvider === 'ollama') {
        service.initialize();
      } else {
        // Get API key from env if not provided
        const envKey = apiKey || this.getApiKeyFromEnv(normalizedProvider);
        if (!envKey) {
          throw new Error(`No API key provided for ${provider}`);
        }
        service.initialize(envKey);
      }

      // Import and register tools
      const { registerTools } = await import('./tools');
      const result = await registerTools(service);
      store.dispatch(createLog(`Registered ${result.toolCount} tools for ${provider} service`, 'debug'));

      store.dispatch(createLog(`Initialized ${provider} service`, 'debug'));
      return service;
    } catch (error) {
      store.dispatch(createLog(`Failed to initialize ${provider} service: ${error.message}`, 'error'));
      throw error;
    }
  }

  getApiKeyFromEnv(provider) {
    const keyMap = {
      openai: import.meta.env.VITE_OPENAI_API_KEY,
      anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
      deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY,
      gemini: import.meta.env.VITE_GEMINI_API_KEY
    };

    return keyMap[provider];
  }

  async sendMessage(messages, options = {}) {
    const { provider = import.meta.env.VITE_DEFAULT_PROVIDER } = options;
    const service = await this.initializeService(provider);
    return service.sendMessage(messages, options);
  }
}

// Create singleton instance
const llmServiceFactory = new LLMServiceFactory();
export default llmServiceFactory;
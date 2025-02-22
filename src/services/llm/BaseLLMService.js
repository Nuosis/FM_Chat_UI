import createLLMInstance from './axiosLLM';
import { getProviderEndpoint } from '../../../utils/providerEndpoints';
import { store } from '../../redux/store';
import { createLog } from '../../redux/slices/appSlice';

export class BaseLLMService {
  constructor(provider) {
    this.provider = provider;
    this.axios = null;
    this.models = null;
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

    // If provider has static models, return them
    if (this.config.models) {
      return this.config.models;
    }

    // Otherwise, fetch models from API
    try {
      store.dispatch(createLog(`Fetching models from ${this.provider}`, 'debug'));
      return await this.fetchModels();
    } catch (error) {
      store.dispatch(createLog(`Error fetching models from ${this.provider}: ${error.message}`, 'error'));
      throw error;
    }
  }

  // This method should be implemented by providers that fetch models from API
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
      return this.parseResponse(response);
    } catch (error) {
      store.dispatch(createLog(`Error in ${this.provider} service: ${error.message}`, 'error'));
      throw error;
    }
  }

  // These methods should be implemented by each provider
  formatAndSendRequest(messages, options) {
    throw new Error('formatAndSendRequest must be implemented by provider');
  }

  parseResponse(response) {
    throw new Error('parseResponse must be implemented by provider');
  }
}
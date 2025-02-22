/**
 * Provider endpoint configurations
 */
export const PROVIDERS = {
  OPENAI: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelsEndpoint: 'https://api.openai.com/v1/models',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {apiKey}' // apiKey will be replaced at runtime
    }
  },
  ANTHROPIC: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '{apiKey}', // apiKey will be replaced at runtime
      'anthropic-version': '2023-06-01'
    },
    models: [
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest1'
    ]
  },
  DEEPSEEK: {
    name: 'Deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {apiKey}' // apiKey will be replaced at runtime
    },
    models: [
      'deepseek-chat',
      'deepseek-reasoner'
    ]
  },
  OLLAMA: {
    name: 'Ollama',
    endpoint: 'http://localhost:11434/api/chat',
    modelsEndpoint: 'http://localhost:11434/api/tags',
    headers: {
      'Content-Type': 'application/json'
    }
  }
};

/**
 * Get provider configuration by name
 * @param {string} providerName - The name of the provider (e.g., 'OPENAI', 'ANTHROPIC')
 * @returns {Object|null} Provider configuration or null if not found
 */
export const getProviderConfig = (providerName) => {
  const provider = PROVIDERS[providerName?.toUpperCase()];
  if (!provider) {
    console.warn(`Provider ${providerName} not found`);
    return null;
  }
  return provider;
};

/**
 * Get provider endpoint with API key
 * @param {string} providerName - The name of the provider
 * @param {string} apiKey - The API key for the provider
 * @returns {Object|null} Provider endpoint configuration with API key or null if provider not found
 */
export const getProviderEndpoint = (providerName, apiKey) => {
  const config = getProviderConfig(providerName);
  if (!config) return null;

  // Deep clone the config to avoid modifying the original
  const endpointConfig = JSON.parse(JSON.stringify(config));

  // Replace apiKey placeholder in headers
  Object.keys(endpointConfig.headers).forEach(key => {
    endpointConfig.headers[key] = endpointConfig.headers[key].replace('{apiKey}', apiKey);
  });

  return endpointConfig;
};

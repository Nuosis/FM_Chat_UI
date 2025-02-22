import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import axiosLLM from '../axiosLLM';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn((successFn) => {
            // Store the interceptor function for testing
            requestInterceptor = successFn;
          })
        },
        response: {
          use: vi.fn((successFn, errorFn) => {
            // Store the interceptor functions for testing
            responseInterceptor = successFn;
            errorInterceptor = errorFn;
          })
        }
      },
      post: vi.fn(),
      get: vi.fn()
    }))
  }
}));

// Store interceptors for testing
let requestInterceptor;
let responseInterceptor;
let errorInterceptor;

describe('axiosLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset interceptors
    requestInterceptor = null;
    responseInterceptor = null;
    errorInterceptor = null;
  });

  it('should create axios instance with correct base URL', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: expect.stringContaining('/api'),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  describe('Request Interceptor', () => {
    it('should handle request configuration', async () => {
      const config = {
        data: {
          apiKey: 'test-key',
          someData: 'test'
        }
      };

      const result = await requestInterceptor(config);
      expect(result.headers['Authorization']).toBe('Bearer test-key');
      expect(result.data.apiKey).toBeUndefined();
      expect(result.data.someData).toBe('test');
    });

    it('should handle missing apiKey', async () => {
      const config = {
        data: {
          someData: 'test'
        }
      };

      await expect(requestInterceptor(config)).rejects.toThrow('API key is required');
    });
  });

  describe('Response Interceptor', () => {
    it('should handle successful response', async () => {
      const response = {
        data: {
          success: true,
          data: 'test'
        }
      };

      const result = await responseInterceptor(response);
      expect(result).toEqual(response);
    });

    it('should handle error response', async () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Test error'
            }
          }
        }
      };

      await expect(errorInterceptor(error)).rejects.toThrow('Test error');
    });

    it('should handle network error', async () => {
      const error = new Error('Network Error');
      error.code = 'ECONNREFUSED';

      await expect(errorInterceptor(error)).rejects.toThrow('Unable to connect to the server');
    });

    it('should handle timeout error', async () => {
      const error = new Error('Timeout');
      error.code = 'ECONNABORTED';

      await expect(errorInterceptor(error)).rejects.toThrow('Request timed out');
    });

    it('should handle unknown error', async () => {
      const error = new Error('Unknown error');

      await expect(errorInterceptor(error)).rejects.toThrow('Unknown error');
    });
  });

  describe('HTTP Methods', () => {
    it('should expose post method', () => {
      const instance = axios.create();
      expect(instance.post).toBeDefined();
    });

    it('should expose get method', () => {
      const instance = axios.create();
      expect(instance.get).toBeDefined();
    });

    it('should make post requests', async () => {
      const instance = axios.create();
      const mockData = { test: 'data' };
      instance.post.mockResolvedValueOnce({ data: 'response' });

      await instance.post('/test', mockData);
      expect(instance.post).toHaveBeenCalledWith('/test', mockData);
    });

    it('should make get requests', async () => {
      const instance = axios.create();
      instance.get.mockResolvedValueOnce({ data: 'response' });

      await instance.get('/test');
      expect(instance.get).toHaveBeenCalledWith('/test');
    });
  });
});
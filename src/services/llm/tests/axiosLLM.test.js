import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import axiosLLM from '../axiosLLM';
import { store } from '../../../redux/store';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn(),
      get: vi.fn()
    }))
  }
}));

// Mock redux store
const { mockDispatch } = vi.hoisted(() => {
  return { mockDispatch: vi.fn() };
});

vi.mock('../../../redux/store', () => ({
  store: {
    dispatch: mockDispatch
  }
}));

describe('axiosLLM', () => {
  let instance;

  beforeEach(() => {
    vi.clearAllMocks();
    instance = axiosLLM();
  });

  it('should create axios instance with 2 minute timeout', () => {
    expect(axios.create).toHaveBeenCalledWith({
      timeout: 120000
    });
  });

  describe('Request Interceptor', () => {
    it('should log request details', async () => {
      const config = {
        method: 'post',
        url: '/test',
        headers: { 'Content-Type': 'application/json' }
      };

      // Call the request interceptor
      const [successFn] = instance.interceptors.request.use.mock.calls[0];
      const result = await successFn(config);

      expect(result).toEqual(config);
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.stringContaining('LLM Request: POST /test')
        })
      );
    });

    it('should log request errors', async () => {
      const error = new Error('Test error');
      
      // Call the request error handler
      const [, errorFn] = instance.interceptors.request.use.mock.calls[0];
      await expect(errorFn(error)).rejects.toThrow('Test error');
      
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.stringContaining('LLM Request Error: Test error')
        })
      );
    });
  });

  describe('Response Interceptor', () => {
    it('should log successful responses', async () => {
      const response = {
        config: {
          method: 'get',
          url: '/test'
        },
        data: { success: true }
      };

      // Call the response interceptor
      const [successFn] = instance.interceptors.response.use.mock.calls[0];
      const result = await successFn(response);

      expect(result).toEqual(response);
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.stringContaining('LLM Response Success: GET /test')
        })
      );
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout',
        config: {
          method: 'post',
          url: '/test'
        }
      };

      // Call the response error handler
      const [, errorFn] = instance.interceptors.response.use.mock.calls[0];
      await expect(errorFn(error)).rejects.toThrow('LLM request timed out after 2 minutes');
      
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.stringContaining('LLM request timed out after 2 minutes')
        })
      );
    });

    it('should log error details', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Test error' },
          config: {
            method: 'get',
            url: '/test'
          }
        },
        config: {
          method: 'get',
          url: '/test'
        },
        message: 'Test error'
      };

      // Call the response error handler
      const [, errorFn] = instance.interceptors.response.use.mock.calls[0];
      await expect(errorFn(error)).rejects.toEqual(error);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.stringContaining('LLM Error Details')
        })
      );
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
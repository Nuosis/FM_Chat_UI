import { describe, it, expect, beforeEach, vi } from 'vitest';
import getStructuredDataTool from '../GetStructuredDataTool';
import llmServiceFactory from '../../../llm';
import { store } from '../../../../redux/store';
import { createLog } from '../../../../redux/slices/appSlice';

// Mock the dependencies
vi.mock('../../../llm');
vi.mock('../../../../redux/store', () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(() => ({
      llm: {
        provider: 'test-provider',
        model: 'test-model'
      }
    }))
  }
}));

describe('GetStructuredDataTool', () => {
  const mockLLMService = {
    sendMessage: vi.fn()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    store.dispatch.mockClear();
    llmServiceFactory.initializeService.mockResolvedValue(mockLLMService);
  });

  it('should validate required parameters', () => {
    expect(getStructuredDataTool.parameters.required).toContain('schema');
    expect(getStructuredDataTool.parameters.required).toContain('tableName');
  });

  it('should throw error when parameters are missing', async () => {
    await expect(getStructuredDataTool.execute({}))
      .rejects
      .toThrow('Missing required parameters: schema, tableName');
    
    expect(store.dispatch).toHaveBeenCalledWith(
      createLog({
        message: 'Missing required parameters: schema, tableName',
        type: 'error'
      })
    );
  });

  it('should successfully parse valid LLM response', async () => {
    const mockSchema = `
      CREATE TABLE REST_Customers (
        __customerID VARCHAR(255),
        _orgID VARCHAR(255),
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        email VARCHAR(255),
        RESTfmDeleteFlag INT,
        dateMODIFIED TIMESTAMP
      );
    `;

    const mockResponse = {
      content: `{
        "REST_Customers": {
          "primaryKey": "__customerID",
          "fields": ["firstName", "lastName", "email"],
          "childTables": [],
          "parentTables": ["REST_Organizations"]
        }
      }`
    };

    mockLLMService.sendMessage.mockResolvedValue(mockResponse);

    const result = await getStructuredDataTool.execute({
      schema: mockSchema,
      tableName: 'REST_Customers'
    });

    expect(result).toEqual({
      "REST_Customers": {
        "primaryKey": "__customerID",
        "fields": ["firstName", "lastName", "email"],
        "childTables": [],
        "parentTables": ["REST_Organizations"]
      }
    });

    // Verify LLM service was called with correct parameters
    expect(llmServiceFactory.initializeService).toHaveBeenCalledWith('test-provider');
    expect(mockLLMService.sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('REST_Customers')
        })
      ]),
      expect.objectContaining({
        model: 'test-model',
        temperature: 0.2
      })
    );
  });

  it('should handle invalid JSON response from LLM', async () => {
    mockLLMService.sendMessage.mockResolvedValue({
      content: 'Not valid JSON'
    });

    await expect(getStructuredDataTool.execute({
      schema: 'mock schema',
      tableName: 'REST_Customers'
    })).rejects.toThrow('Failed to analyze schema: LLM response was not valid JSON');

    expect(store.dispatch).toHaveBeenCalledWith(
      createLog({
        message: expect.stringContaining('Failed to parse LLM response as JSON'),
        type: 'error'
      })
    );
  });

  it('should handle LLM service errors', async () => {
    const errorMessage = 'LLM service error';
    mockLLMService.sendMessage.mockRejectedValue(new Error(errorMessage));

    await expect(getStructuredDataTool.execute({
      schema: 'mock schema',
      tableName: 'REST_Customers'
    })).rejects.toThrow(`Failed to analyze schema: ${errorMessage}`);

    expect(store.dispatch).toHaveBeenCalledWith(
      createLog({
        message: expect.stringContaining(errorMessage),
        type: 'error'
      })
    );
  });
});
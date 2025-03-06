import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import duckDuckGoSearchTool from '../DuckDuckGoSearchTool';

// Mock axios
vi.mock('axios');

describe('DuckDuckGoSearchTool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Spy on console.log and console.error
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console mocks
    console.log.mockRestore();
    console.error.mockRestore();
  });

  it('should have the correct structure', () => {
    expect(duckDuckGoSearchTool).toHaveProperty('name', 'duckduckgo_search');
    expect(duckDuckGoSearchTool).toHaveProperty('description');
    expect(duckDuckGoSearchTool).toHaveProperty('progressText', 'Searching DuckDuckGo...');
    expect(duckDuckGoSearchTool).toHaveProperty('parameters');
    expect(duckDuckGoSearchTool).toHaveProperty('execute');
    expect(typeof duckDuckGoSearchTool.execute).toBe('function');
  });

  it('should throw an error for empty query', async () => {
    await expect(duckDuckGoSearchTool.execute({ query: '' }))
      .rejects
      .toThrow('A valid search query is required');
    
    await expect(duckDuckGoSearchTool.execute({ query: '   ' }))
      .rejects
      .toThrow('A valid search query is required');
  });

  it('should return formatted results when abstract is available', async () => {
    // Mock successful response with abstract
    axios.get.mockResolvedValueOnce({
      data: {
        Abstract: 'This is a test abstract',
        AbstractSource: 'TestSource',
        AbstractURL: 'https://example.com/abstract',
        RelatedTopics: [
          { Text: 'Related topic 1', FirstURL: 'https://example.com/topic1' },
          { Text: 'Related topic 2', FirstURL: 'https://example.com/topic2' }
        ]
      }
    });

    const result = await duckDuckGoSearchTool.execute({ query: 'test query' });
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith('https://api.duckduckgo.com/', {
      params: {
        q: 'test query',
        format: 'json',
        no_html: 1,
        skip_disambig: 1
      }
    });
    
    // Verify result structure
    expect(result).toEqual({
      abstract: 'This is a test abstract',
      abstractSource: 'TestSource',
      abstractURL: 'https://example.com/abstract',
      relatedTopics: [
        { text: 'Related topic 1', url: 'https://example.com/topic1' },
        { text: 'Related topic 2', url: 'https://example.com/topic2' }
      ]
    });
    
    // Verify logging
    expect(console.log).toHaveBeenCalledWith('Executing DuckDuckGo search for query: "test query"');
    expect(console.log).toHaveBeenCalledWith('Received response from DuckDuckGo API for query: "test query"');
  });

  it('should use first related topic as abstract when no abstract is available', async () => {
    // Mock response with no abstract but with related topics
    axios.get.mockResolvedValueOnce({
      data: {
        Abstract: '',
        AbstractSource: '',
        AbstractURL: '',
        RelatedTopics: [
          { Text: 'Related topic 1', FirstURL: 'https://example.com/topic1' },
          { Text: 'Related topic 2', FirstURL: 'https://example.com/topic2' }
        ]
      }
    });

    const result = await duckDuckGoSearchTool.execute({ query: 'test query' });
    
    // Verify result structure
    expect(result).toEqual({
      abstract: 'Related topic 1',
      abstractSource: 'DuckDuckGo',
      abstractURL: 'https://example.com/topic1',
      relatedTopics: [
        { text: 'Related topic 1', url: 'https://example.com/topic1' },
        { text: 'Related topic 2', url: 'https://example.com/topic2' }
      ]
    });
  });

  it('should return a message when no results are found', async () => {
    // Mock response with no abstract and no related topics
    axios.get.mockResolvedValueOnce({
      data: {
        Abstract: '',
        AbstractSource: '',
        AbstractURL: '',
        RelatedTopics: []
      }
    });

    const result = await duckDuckGoSearchTool.execute({ query: 'test query' });
    
    // Verify result structure
    expect(result).toEqual({
      message: 'No results found for "test query"',
      query: 'test query'
    });
  });

  it('should handle API errors', async () => {
    // Mock API error
    const errorMessage = 'Network error';
    axios.get.mockRejectedValueOnce(new Error(errorMessage));

    await expect(duckDuckGoSearchTool.execute({ query: 'test query' }))
      .rejects
      .toThrow(`Failed to search DuckDuckGo: ${errorMessage}`);
    
    // Verify error logging
    expect(console.error).toHaveBeenCalled();
  });
});
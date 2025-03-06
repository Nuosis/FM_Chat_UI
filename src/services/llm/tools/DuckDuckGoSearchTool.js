import axios from 'axios';

export default {
  name: 'duckduckgo_search',
  description: `Search the web using DuckDuckGo. Provides search results for a given query.
Examples:
- "javascript promises" → {"query": "javascript promises"}
- "climate change facts" → {"query": "climate change facts"}
- "recipe for chocolate cake" → {"query": "recipe for chocolate cake"}`,
  progressText: 'Searching DuckDuckGo...',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to send to DuckDuckGo'
      }
    },
    required: ['query']
  },
  execute: async ({ query }) => {
    try {
      // Validate query
      if (!query || typeof query !== 'string' || query.trim() === '') {
        throw new Error('A valid search query is required');
      }

      console.log(`Executing DuckDuckGo search for query: "${query}"`);
      
      // Make request to DuckDuckGo API with browser-like headers
      console.log(`Sending request to DuckDuckGo API with params: q=${encodeURIComponent(query)}, format=json`);
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
          t: 'web' // Add browser-like parameter
        },
        headers: {
          // Add browser-like headers to avoid being blocked
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://duckduckgo.com/'
        }
      });

      console.log(`Received response from DuckDuckGo API for query: "${query}"`);
      console.log(`Response status: ${response.status}`);
      
      // Log response structure to help diagnose API format changes
      console.log(`Response data structure: ${Object.keys(response.data).join(', ')}`);
      
      // Log detailed response data for debugging
      console.log(`Abstract: "${response.data.Abstract}"`);
      console.log(`AbstractText: "${response.data.AbstractText}"`);
      console.log(`RelatedTopics count: ${response.data.RelatedTopics?.length || 0}`);
      if (response.data.RelatedTopics?.length > 0) {
        console.log(`First RelatedTopic: ${JSON.stringify(response.data.RelatedTopics[0])}`);
      }
      
      // Extract and format results
      const data = response.data;
      let results = {
        abstract: data.Abstract,
        abstractSource: data.AbstractSource,
        abstractURL: data.AbstractURL,
        relatedTopics: []
      };
      
      console.log(`Extracted abstract: "${results.abstract}"`);
      
      // Add related topics if available
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        results.relatedTopics = data.RelatedTopics
          .filter(topic => topic.Text) // Only include topics with text
          .map(topic => ({
            text: topic.Text,
            url: topic.FirstURL
          }))
          .slice(0, 5); // Limit to 5 related topics
        
        console.log(`Filtered relatedTopics count: ${results.relatedTopics.length}`);
      }

      // If no abstract but we have related topics, use the first one
      if (!results.abstract && results.relatedTopics.length > 0) {
        console.log(`No abstract found, using first related topic as abstract`);
        results.abstract = results.relatedTopics[0].text;
        results.abstractURL = results.relatedTopics[0].url;
        results.abstractSource = 'DuckDuckGo';
      }

      // If still no results, return a message
      if (!results.abstract && results.relatedTopics.length === 0) {
        console.log(`No results found for query: "${query}"`);
        return {
          message: `No results found for "${query}"`,
          query
        };
      }
      
      console.log(`Returning results for query "${query}": ${JSON.stringify(results, null, 2)}`);

      return results;
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      throw new Error(`Failed to search DuckDuckGo: ${error.message}`);
    }
  }
};
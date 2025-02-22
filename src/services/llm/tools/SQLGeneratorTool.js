import { Parser } from 'node-sql-parser';
import llmServiceFactory from '../../llm';
import { store } from '../../../redux/store';

const parser = new Parser();

export default {
  name: 'sql_generator',
  description: 'Generate and validate SQL SELECT statements for FileMaker based on natural language description',
  progressText: 'Generating SQL query...',
  parameters: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Natural language description of desired query (e.g., "find every customer with an active Worksheet")'
      },
      schema: {
        type: 'object',
        description: 'FileMaker schema definition from app state',
      }
    },
    required: ['description', 'schema']
  },
  execute: async (input) => {
    try {
      // Validate input against schema
      if (!input.description || !input.schema) {
        throw new Error('Missing required parameters: description and schema');
      }
      
      const { description, schema } = input;
      const sql = await generateFileMakerSQL(description, schema);

      // Validate SQL syntax
      try {
        parser.astify(sql);
        return {
          sql,
          valid: true,
          scriptParams: {
            query: sql,
            tables: extractTablesFromSQL(sql)
          }
        };
      } catch (error) {
        return {
          sql,
          valid: false,
          error: error.message
        };
      }
    } catch (error) {
      throw new Error(`Failed to generate SQL: ${error.message}`);
    }
  }
};

async function generateFileMakerSQL(description, schema) {
  // Get current LLM settings from store
  const state = store.getState();
  const llmSettings = state.llm;
  
  // Initialize LLM service
  const service = await llmServiceFactory.initializeService(llmSettings.provider);
  
  // Create system prompt for SQL generation
  const systemPrompt = `You are a SQL generation assistant specializing in FileMaker SQL syntax.
Your task is to generate a SQL SELECT statement based on the provided schema and natural language description.

Rules for FileMaker SQL:
1. Use proper table and field names exactly as they appear in the schema
2. For text comparisons, use double quotes (e.g., Status = "Active")
3. Table and field names are case-sensitive
4. JOIN syntax must use proper relationship names from the schema
5. Avoid using aliases unless necessary for clarity
6. Include only necessary fields in the SELECT clause
7. Return only the SQL statement without any explanation or additional text

Schema Structure:
${JSON.stringify(schema, null, 2)}

Generate a SQL SELECT statement that is:
- Valid FileMaker SQL syntax
- Matches the user's requirements
- Uses appropriate JOINs based on schema relationships
- Includes relevant WHERE conditions
- Returns only necessary fields`;

  // Send request to LLM
  const response = await service.sendMessage(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a SQL SELECT statement for: ${description}` }
    ],
    {
      model: llmSettings.model,
      temperature: 0.2 // Lower temperature for more precise SQL generation
    }
  );

  return response.content.trim();
}

function extractTablesFromSQL(sql) {
  const fromMatch = sql.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  const joinMatches = sql.match(/JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
  
  const tables = [];
  if (fromMatch) {
    tables.push(fromMatch[1]);
  }
  joinMatches.forEach(match => {
    const table = match.replace(/JOIN\s+/i, '');
    tables.push(table);
  });
  
  return tables;
}
import { Parser } from 'node-sql-parser';
import llmServiceFactory from '../../llm';
import { store } from '../../../redux/store';
import { createLog, LogType } from '../../../redux/slices/appSlice';

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
        description: 'Database schema with tables, fields, and relationships',
        properties: {
          tables: {
            type: 'object',
            description: 'Map of table names to table definitions',
            properties: {
              table_example: {
                type: 'object',
                description: 'Example table definition',
                properties: {
                  primaryKey: {
                    type: 'string',
                    description: 'Primary key field name'
                  },
                  fields: {
                    type: 'array',
                    description: 'List of field names in the table',
                    items: {
                      type: 'string'
                    }
                  },
                  displayFields: {
                    type: 'array',
                    description: 'List of fields to display',
                    items: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          relationships: {
            type: 'array',
            description: 'List of relationships between tables',
            items: {
              type: 'object',
              properties: {
                sourceTable: {
                  type: 'string',
                  description: 'Source table name'
                },
                targetTable: {
                  type: 'string',
                  description: 'Target table name'
                },
                type: {
                  type: 'string',
                  description: 'Type of relationship (e.g., "one-to-many")'
                }
              }
            }
          }
        }
      }
    },
    required: ['description', 'schema']
  },
  execute: async (input) => {
    try {
      store.dispatch(createLog({
        message: 'Starting SQL generation',
        type: LogType.INFO
      }));

      // Validate input against schema
      if (!input.description) {
        store.dispatch(createLog({
          message: 'Missing required parameter: description',
          type: LogType.ERROR
        }));
        throw new Error('Missing required parameter: description');
      }

      const { description, schema } = input;
      store.dispatch(createLog({
        message: `Generating SQL for description: "${description}"`,
        type: LogType.INFO
      }));

      const sql = await generateFileMakerSQL(description, schema);
      store.dispatch(createLog({
        message: `Generated SQL: ${sql}`,
        type: LogType.DEBUG
      }));

      // Validate SQL syntax
      try {
        // Remove outer quotes for parsing, but keep them in the returned SQL
        const sqlForParsing = cleanSQL(sql).replace(/^"(.*)"$/, '$1');
        parser.astify(sqlForParsing);
        store.dispatch(createLog({
          message: 'SQL validation successful',
          type: LogType.SUCCESS
        }));
        // Extract table names from the schema
        const schemaTableNames = Object.keys(schema.tables);
        
        // Extract table names from the SQL query
        // This is a simple extraction and might need to be improved for complex queries
        const sqlTableNames = [];
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('from users')) {
          sqlTableNames.push('users');
        }
        
        // Combine table names from both sources
        const tableNames = [...new Set([...schemaTableNames, ...sqlTableNames])];
        
        return {
          sql,
          valid: true,
          scriptParams: {
            query: sql,
            tables: tableNames
          }
        };
      } catch (error) {
        store.dispatch(createLog({
          message: `SQL validation failed: ${error.message}`,
          type: LogType.WARNING
        }));
        return {
          sql,
          valid: false,
          error: error.message
        };
      }
    } catch (error) {
      store.dispatch(createLog({
        message: `Failed to generate SQL: ${error.message}`,
        type: LogType.ERROR
      }));
      throw new Error(`Failed to generate SQL: ${error.message}`);
    }
  }
};

async function generateFileMakerSQL(description, schema) {
  // Get current LLM settings from store
  const state = store.getState();
  const llmSettings = state.llm;
  
  store.dispatch(createLog({
    message: `Initializing LLM service with provider: ${llmSettings.provider}`,
    type: LogType.INFO
  }));

  // Initialize LLM service
  const service = await llmServiceFactory.initializeService(llmSettings.provider);
  
  store.dispatch(createLog({
    message: 'Creating system prompt for SQL generation',
    type: LogType.DEBUG
  }));

  // Create system prompt for SQL generation
  const systemPrompt = `You are a SQL generation assistant specializing in FileMaker SQL syntax.
Your task is to generate a SQL SELECT statement based on the provided schema and natural language description.

FileMaker SQL Generation Rules:

1. Table & Field Names
   - Use double quotes around table and field names (e.g. "REST_Customers", "Client_Type")
   - They must match the exact spelling and case as defined in the schema

2. String Literals
   - Use single quotes for string literals in conditions (e.g. WHERE "Client_Type" = 'Former Customer')

3. Case Sensitivity
   - FileMaker SQL is case-sensitive for both field names and data
   - If the exact case of a data value is uncertain, use OR to handle multiple possibilities
   - Example: WHERE "Client_Type" = 'former customer' OR "Client_Type" = 'Former Customer'

4. JOIN Syntax
   - When joining tables, use the exact relationship names from the schema
   - Avoid table aliases unless absolutely necessary for clarity

5. SELECT Clause
   - Include only the fields needed in the result set
   - Reference each field with its table name if needed for clarity (e.g. "TableName"."FieldName")

6. WHERE Clause
   - Include only relevant conditions
   - Respect any specific text or numeric conditions, using single quotes for literals
   - If case is not clear for a condition, use OR to handle multiple possibilities

7. Output Format
   - Return the SQL statement enclosed in quotes
   - Do not add additional text or explanation around the SQL statement

Available Tables:
${Object.entries(schema.tables).map(([tableName, tableData]) => `
Table: ${tableName}
Fields: ${tableData.fields.join(', ')}
`).join('\n')}

Example of correct format:
"SELECT \"Name\", \"Company\" FROM \"REST_Customers\" WHERE \"Client_Type\" = 'customer' OR \"Client_Type\" = 'Customer'"

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

  store.dispatch(createLog({
    message: 'Received response from LLM service',
    type: LogType.DEBUG
  }));

  const sql = response.content.trim();
  store.dispatch(createLog({
    message: `Raw SQL response: ${sql}`,
    type: LogType.DEBUG
  }));

  return sql;
}

function cleanSQL(sql) {
  // Remove any code block markers and trim whitespace
  let cleaned = sql.replace(/^```sql\s*|```$/g, '').trim();
  
  // If the SQL isn't already wrapped in quotes, wrap it and escape internal quotes
  if (!cleaned.startsWith('"') || !cleaned.endsWith('"')) {
    // Escape any existing double quotes that aren't already escaped
    cleaned = cleaned.replace(/(?<!\\)"/g, '\\"');
    // Wrap the entire SQL in quotes
    cleaned = `"${cleaned}"`;
  }
  
  return cleaned;
}
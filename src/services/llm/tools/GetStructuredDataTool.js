import llmServiceFactory from '../../llm';
import { store } from '../../../redux/store';
import { createLog, LogType } from '../../../redux/slices/appSlice';

export default {
  name: 'get_structured_data',
  description: 'Analyze a SQL schema dump and extract structured metadata about a specific table',
  progressText: 'Analyzing SQL schema...',
  parameters: {
    type: 'object',
    properties: {
      schema: {
        type: 'string',
        description: 'The complete SQL schema dump to analyze'
      },
      tableName: {
        type: 'string',
        description: 'The name of the table to analyze (e.g., REST_Customers)'
      }
    },
    required: ['schema', 'tableName']
  },
  execute: async (input) => {
    try {
      store.dispatch(createLog({
        message: 'Starting schema analysis',
        type: LogType.INFO
      }));

      // Validate input
      if (!input.schema || !input.tableName) {
        const missing = [];
        if (!input.schema) missing.push('schema');
        if (!input.tableName) missing.push('tableName');
        const error = `Missing required parameters: ${missing.join(', ')}`;
        store.dispatch(createLog({
          message: error,
          type: LogType.ERROR
        }));
        throw new Error(error);
      }

      const { schema, tableName } = input;
      store.dispatch(createLog({
        message: `Analyzing schema for table: "${tableName}"`,
        type: LogType.INFO
      }));

      const result = await generateStructuredData(schema, tableName);
      store.dispatch(createLog({
        message: `Generated structured data: ${JSON.stringify(result, null, 2)}`,
        type: LogType.DEBUG
      }));

      return result;
    } catch (error) {
      store.dispatch(createLog({
        message: `Failed to analyze schema: ${error.message}`,
        type: LogType.ERROR
      }));
      throw new Error(`Failed to analyze schema: ${error.message}`);
    }
  }
};

async function generateStructuredData(schema, tableName) {
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
    message: 'Creating system prompt for schema analysis',
    type: LogType.DEBUG
  }));

  // Create system prompt for schema analysis
  const systemPrompt = `You are a database schema parser. Your task is to analyze a provided SQL schema dump and extract structured metadata about a specific table. 

Follow these rules strictly:
1. **Identify the Primary Key**  
   - The primary key is the field that starts with '__' (double underscore).

2. **Identify Parent Tables** (This table is a child)  
   - If this table has a **parent table**, the **parent table will contain a field that starts with '_'** (single underscore) and often **contains a shortened version of this table's name** (e.g., a parent table for 'REST_Customers' might contain '_custID').
   - The **parent table** must be present in the provided schema to be included. Use the exact table name from the schema.

3. **Identify Child Tables** (This table is a parent)  
   - If this table has **child tables**, it will contain **foreign keys (_fieldName')** that reference other tables.  
   - Foreign keys typically **follow a naming pattern based on shortened table names** (e.g., '_orgID' refers to 'REST_Organizations').

4. **Extract Field Information**  
   - List all **non-primary, non-foreign** fields under '"fields"'.  
   - Do not include system fields (like 'RESTfmDeleteFlag' or 'dateMODIFIED' fields).

Return **only valid JSON** with no explanations, formatting, or extra text:
{
  "TABLE NAME": {
    "primaryKey": "PrimaryKeyField",
    "fields": ["Field1", "Field2", "Field3"],
    "childTables": ["RelatedTable1", "RelatedTable2"],
    "parentTables": ["ParentTable1", "ParentTable2"]
  }
}

Example:
For a table "REST_Customers" with fields:
__customerID, _orgID, firstName, lastName, email, RESTfmDeleteFlag, dateMODIFIED

The response should be:
{
  "REST_Customers": {
    "primaryKey": "__customerID",
    "fields": ["firstName", "lastName", "email"],
    "childTables": [],
    "parentTables": ["REST_Organizations"]
  }
}`;

  // Send request to LLM
  const response = await service.sendMessage(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Schema:\n${schema}\n\nAnalyze table: ${tableName}` }
    ],
    {
      model: llmSettings.model,
      temperature: 0.2 // Lower temperature for more precise analysis
    }
  );

  store.dispatch(createLog({
    message: 'Received response from LLM service',
    type: LogType.DEBUG
  }));

  try {
    // Clean the response by removing markdown code block markers
    const cleanedResponse = response.content
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '')
      .trim();

    // Parse the cleaned response as JSON
    const result = JSON.parse(cleanedResponse);
    store.dispatch(createLog({
      message: 'Successfully parsed structured data',
      type: LogType.SUCCESS
    }));
    return result;
  } catch (error) {
    store.dispatch(createLog({
      message: `Failed to parse LLM response as JSON: ${error.message}`,
      type: LogType.ERROR
    }));
    throw new Error('LLM response was not valid JSON');
  }
}
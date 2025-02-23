import { store } from '../../../redux/store';
import { createLog, LogType } from '../../../redux/slices/appSlice';

export default {
  name: 'schema_from_state_for_sql',
  description: 'Retrieve and format the FileMaker database schema from application state for SQL generation',
  progressText: 'Gathering Database Schema...',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Format to return the schema in (raw, structured)',
        enum: ['raw', 'structured'],
        default: 'structured'
      }
    }
  },
  execute: async (input) => {
    try {
      store.dispatch(createLog({
        message: 'Retrieving schema from state',
        type: LogType.INFO
      }));

      const state = store.getState();
      const schema = state.app.schema;

      if (!schema) {
        store.dispatch(createLog({
          message: 'Schema not found in app state',
          type: LogType.ERROR
        }));
        throw new Error('Schema not found in app state');
      }

      store.dispatch(createLog({
        message: 'Successfully retrieved schema',
        type: LogType.SUCCESS
      }));

      // Return raw schema if requested
      if (input.format === 'raw') {
        return schema;
      }

      // Transform schema into structured format for SQL generation
      const structuredSchema = {
        tables: schema.tableSchema.map(tableDefinition => {
          // Extract table name from CREATE TABLE statement
          const tableMatch = tableDefinition.match(/CREATE TABLE "([^"]+)"/);
          if (!tableMatch) return null;

          const tableName = tableMatch[1];
          
          // Extract fields from CREATE TABLE statement
          const fieldsMatch = tableDefinition.match(/\((.*)\)/s);
          if (!fieldsMatch) return null;

          const fieldsText = fieldsMatch[1];
          const fieldLines = fieldsText.split(',\r')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('PRIMARY KEY') && !line.startsWith('FOREIGN KEY'));

          const fields = fieldLines.map(line => {
            const fieldMatch = line.match(/"([^"]+)"\s+([^\s,]+)(?:\s*\/\*([^*]+)\*\/)?/);
            if (!fieldMatch) return null;

            return {
              name: fieldMatch[1],
              type: fieldMatch[2].toLowerCase(),
              description: fieldMatch[3] ? fieldMatch[3].trim() : undefined
            };
          }).filter(Boolean);

          return {
            name: tableName,
            fields
          };
        }).filter(Boolean),
        relationships: schema.tableOccuranceMap
          .filter(rel => rel.baseTable && rel.name)
          .map(rel => ({
            fromTable: rel.baseTable,
            toTable: rel.name,
            fromField: '__ID', // Common FileMaker primary key
            toField: `_${rel.baseTable.toLowerCase()}ID` // Common FileMaker foreign key pattern
          }))
      };

      return structuredSchema;

    } catch (error) {
      store.dispatch(createLog({
        message: `Failed to retrieve schema: ${error.message}`,
        type: LogType.ERROR
      }));
      throw new Error(`Failed to retrieve schema: ${error.message}`);
    }
  }
};
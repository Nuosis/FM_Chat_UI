import { store } from '../../../redux/store';
import { createLog, LogType } from '../../../redux/slices/appSlice';

export default {
  name: 'schema_from_state_for_dapi',
  description: 'Retrieve and format the FileMaker database schema from application state for Data API operations',
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

      // Transform schema into structured format for Data API operations
      const structuredSchema = {
        layouts: schema.layouts,
        layoutFields: {}
      };

      // Extract fields for each layout from table schema
      schema.tableOccuranceMap.forEach(mapping => {
        if (!mapping.name || !mapping.baseTable) return;

        // Find the table schema for this layout
        const tableSchema = schema.tableSchema.find(ts => {
          const match = ts.match(/CREATE TABLE "([^"]+)"/);
          return match && match[1] === mapping.name;
        });

        if (!tableSchema) return;

        // Extract fields from CREATE TABLE statement
        const fieldsMatch = tableSchema.match(/\((.*)\)/s);
        if (!fieldsMatch) return;

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

        structuredSchema.layoutFields[mapping.name] = fields;
      });

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
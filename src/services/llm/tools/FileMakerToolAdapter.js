import { inFileMaker, findRecords, createRecord, updateRecord, deleteRecord, executeScript } from '../../../utils/filemaker';

export class FileMakerToolAdapter {
  name = 'filemaker';
  description = 'Adapter for executing FileMaker tools';
  schema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['find', 'create', 'update', 'delete', 'script']
      },
      layout: { type: 'string' },
      data: { type: 'object' },
      scriptName: { type: 'string' },
      scriptParameter: { type: 'string' }
    },
    required: ['action', 'layout']
  };

  async execute({ action, layout, data, scriptName, scriptParameter }) {
    if (!inFileMaker) {
      throw new Error('FileMaker tools are only available in FileMaker environment');
    }

    if (!layout) {
      throw new Error('Layout is required');
    }

    try {
      switch (action) {
        case 'find':
          return await findRecords(layout, data);

        case 'create':
          if (!data) {
            throw new Error('Data is required for create action');
          }
          return await createRecord(layout, data);

        case 'update':
          if (!data?.id) {
            throw new Error('Record ID is required for update action');
          }
          return await updateRecord(layout, data);

        case 'delete':
          if (!data?.id) {
            throw new Error('Record ID is required for delete action');
          }
          return await deleteRecord(layout, data.id);

        case 'script':
          if (!scriptName) {
            throw new Error('Script name is required for script action');
          }
          return await executeScript(layout, scriptName, scriptParameter);

        default:
          throw new Error('Invalid action');
      }
    } catch (error) {
      throw error; // Pass through the original error
    }
  }
}
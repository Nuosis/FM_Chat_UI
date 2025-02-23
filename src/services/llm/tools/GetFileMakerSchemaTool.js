import { store } from '../../../redux/store';
import { createLog, LogType } from '../../../redux/slices/appSlice';

export default {
  name: 'get_filemaker_schema',
  description: 'Retrieve the raw FileMaker database schema from application state',
  progressText: 'Gathering Database Schema...',
  execute: async () => {
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

      return schema;

    } catch (error) {
      store.dispatch(createLog({
        message: `Failed to retrieve schema: ${error.message}`,
        type: LogType.ERROR
      }));
      throw new Error(`Failed to retrieve schema: ${error.message}`);
    }
  }
};
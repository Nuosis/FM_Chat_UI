import { createSlice } from '@reduxjs/toolkit';

export const LogType = {
  INFO: 'info',
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  DEBUG: 'debug'
};

const initialState = {
  logs: [],
  schema: null
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    createLog: {
      reducer: (state, action) => {
        state.logs.push(action.payload);
      },
      prepare: (messageOrPayload, type) => {
        let log;
        
        if (typeof messageOrPayload === 'string') {
          // Handle string message with optional type parameter
          log = {
            message: messageOrPayload,
            type: type || LogType.INFO,
            timestamp: new Date().toISOString()
          };
        } else if (typeof messageOrPayload === 'object') {
          // Handle object payload
          log = {
            message: messageOrPayload.message,
            type: messageOrPayload.type || LogType.INFO,
            timestamp: new Date().toISOString()
          };
        } else {
          // Invalid payload type
          console.error('Invalid log payload:', messageOrPayload);
          log = {
            message: 'Invalid log message',
            type: LogType.ERROR,
            timestamp: new Date().toISOString()
          };
        }
        
        return { payload: log };
      }
    },
    clearLogs: (state) => {
      state.logs = [];
    },
    setSchema: (state, action) => {
      state.schema = action.payload;
    }
  }
});

export const { createLog, clearLogs, setSchema } = appSlice.actions;
export default appSlice.reducer;
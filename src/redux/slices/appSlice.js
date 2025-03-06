import { createSlice } from '@reduxjs/toolkit';

export const LogType = {
  INFO: 'info',
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  DEBUG: 'debug'
};

// Parse boolean from environment variable string
const parseBooleanEnv = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  return value.toLowerCase() === 'true';
};

const initialState = {
  logs: [],
  schema: null,
  showHeader: parseBooleanEnv(import.meta.env.VITE_SHOW_HEADER, true) // Feature flag to control header visibility
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
    },
    toggleHeader: (state) => {
      state.showHeader = !state.showHeader;
    },
    setHeaderVisibility: (state, action) => {
      state.showHeader = action.payload;
    }
  }
});

export const { createLog, clearLogs, setSchema, toggleHeader, setHeaderVisibility } = appSlice.actions;
export default appSlice.reducer;
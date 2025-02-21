import { createSlice } from '@reduxjs/toolkit';

export const LogType = {
  INFO: 'info',
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success'
};

const initialState = {
  logs: [],
  schema: null
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    createLog: (state, action) => {
      const { payload } = action;
      const log = {
        message: typeof payload === 'string' ? payload : payload.message,
        type: typeof payload === 'string' ? LogType.INFO : payload.type,
        timestamp: new Date().toISOString()
      };
      state.logs.push(log);
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
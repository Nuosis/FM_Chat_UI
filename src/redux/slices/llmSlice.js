import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  temperature: 0.7,
  systemInstructions: 'Currently, the user is chatting with you from within a FileMaker database. Most likely their question will be related to the database. Do not make up information about this database. If you do not know the answer or need more information, ask.',
  provider: import.meta.env.VITE_DEFAULT_PROVIDER || 'openai',
  model: import.meta.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
  isInitialized: false,
  initError: null,
  registeredTools: {
    count: 0,
    error: null
  }
};

const llmSlice = createSlice({
  name: 'llm',
  initialState,
  reducers: {
    setTemperature: (state, action) => {
      state.temperature = action.payload;
    },
    setSystemInstructions: (state, action) => {
      state.systemInstructions = action.payload;
    },
    setProvider: (state, action) => {
      state.provider = action.payload;
      // Reset initialization state when provider changes
      state.isInitialized = false;
      state.initError = null;
    },
    setModel: (state, action) => {
      state.model = action.payload;
    },
    setInitialized: (state, action) => {
      state.isInitialized = true;
      state.initError = null;
    },
    setInitError: (state, action) => {
      state.isInitialized = false;
      state.initError = action.payload;
    },
    setRegisteredTools: (state, action) => {
      state.registeredTools = {
        count: action.payload.toolCount,
        error: action.payload.error || null
      };
    }
  }
});

export const {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel,
  setInitialized,
  setInitError,
  setRegisteredTools
} = llmSlice.actions;

export default llmSlice.reducer;
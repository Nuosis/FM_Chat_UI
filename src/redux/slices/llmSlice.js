import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  temperature: 0.7,
  systemInstructions: 'You are a helpful AI assistant.',
  provider: null,
  model: null,
  streamingEnabled: true
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
    },
    setModel: (state, action) => {
      state.model = action.payload;
    },
    setStreamingEnabled: (state, action) => {
      state.streamingEnabled = action.payload;
    }
  }
});

export const {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel,
  setStreamingEnabled
} = llmSlice.actions;

export default llmSlice.reducer;
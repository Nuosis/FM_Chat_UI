import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import llmReducer from './slices/llmSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    llm: llmReducer
  }
});
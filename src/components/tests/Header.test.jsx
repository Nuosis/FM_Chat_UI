import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Header from '../Header';

const mockStore = configureStore([]);

describe('Header Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        systemInstructions: 'You are a helpful assistant'
      }
    });
  });

  it('should render the provider selector', () => {
    render(
      <Provider store={store}>
        <Header 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          setActiveComponent={() => {}}
          activeComponent="LLMChat"
        />
      </Provider>
    );
    // Find the label by its class
    const label = screen.getByText('AI Provider', { selector: '.MuiInputLabel-root' });
    expect(label).toBeInTheDocument();
    
    // Find all comboboxes and get the first one (AI Provider)
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes[0]).toBeInTheDocument();
    expect(comboboxes[0]).toHaveTextContent('Openai');
  });

  it('should render the settings icon', () => {
    render(
      <Provider store={store}>
        <Header 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          setActiveComponent={() => {}}
          activeComponent="LLMChat"
        />
      </Provider>
    );
    const settingsIcon = screen.getByTestId('SettingsIcon');
    expect(settingsIcon).toBeInTheDocument();
  });
});
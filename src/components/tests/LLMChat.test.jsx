import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import LLMChat from '../LLMChat';
import llmServiceFactory from '../../services/llm';

// Mock the llmServiceFactory
jest.mock('../services/llm');

const mockStore = configureStore([]);

describe('LLMChat Component', () => {
  let store;
  let mockService;

  beforeEach(() => {
    mockService = {
      sendMessage: jest.fn(),
      getTools: jest.fn().mockReturnValue([
        { name: 'exampleTool', description: 'Example tool description' },
        { name: 'sqlGenerator', description: 'SQL generation tool' }
      ])
    };

    llmServiceFactory.getService.mockReturnValue(mockService);

    store = mockStore({
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        systemInstructions: 'You are a helpful assistant',
        registeredTools: {
          error: null
        }
      }
    });
  });

  it('should include registered tools in LLM calls', async () => {
    render(
      <Provider store={store}>
        <LLMChat />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('You are a helpful AI assistant')
          })
        ]),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  it('should handle tool queries correctly', async () => {
    render(
      <Provider store={store}>
        <LLMChat />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'What tools are available?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockService.getTools).toHaveBeenCalled();
      expect(screen.getByText(/Available tools:/i)).toBeInTheDocument();
      expect(screen.getByText(/exampleTool:/i)).toBeInTheDocument();
      expect(screen.getByText(/sqlGenerator:/i)).toBeInTheDocument();
    });
  });

  it('should show error when no tools are available', async () => {
    mockService.getTools.mockReturnValue([]);
    
    render(
      <Provider store={store}>
        <LLMChat />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'What tools are available?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/No tools are currently available/i)).toBeInTheDocument();
    });
  });

  it('should show tool registration errors', () => {
    store = mockStore({
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        systemInstructions: 'You are a helpful assistant',
        registeredTools: {
          error: 'Failed to register some tools'
        }
      }
    });

    render(
      <Provider store={store}>
        <LLMChat />
      </Provider>
    );

    expect(screen.getByText(/Some tools failed to register/i)).toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LLMChat from '../LLMChat';
import llmServiceFactory from '../../services/llm';

// Mock the llmServiceFactory
vi.mock('../../services/llm', () => ({
  default: {
    getService: vi.fn()
  }
}));

const mockStore = configureStore([]);

describe('LLMChat Component', () => {
  let store;
  let mockService;

  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    mockService = {
      sendMessage: vi.fn().mockResolvedValue({ content: 'Mock response' }),
      getTools: vi.fn().mockReturnValue([
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
      },
      app: {
        messages: []
      }
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
      },
      app: {
        messages: []
      }
    });

    render(
      <Provider store={store}>
        <LLMChat />
      </Provider>
    );

    expect(screen.getByText(/Some tools failed to register/i)).toBeInTheDocument();
  });

  it('should handle tool queries correctly', async () => {
    render(
      <Provider store={store}>
        <LLMChat />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'What tools are available?' } });
    
    // Find send button by its icon
    const sendButton = screen.getByTestId('SendIcon').closest('button');
    fireEvent.click(sendButton);

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
    
    // Find send button by its icon
    const sendButton = screen.getByTestId('SendIcon').closest('button');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/No tools are currently available/i)).toBeInTheDocument();
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
    
    // Find send button by its icon
    const sendButton = screen.getByTestId('SendIcon').closest('button');
    fireEvent.click(sendButton);

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

    await waitFor(() => {
      expect(screen.getByText('Mock response')).toBeInTheDocument();
    });
  });
});
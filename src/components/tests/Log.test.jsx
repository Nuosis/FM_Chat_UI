import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Log from '../Log';
import { LogType } from '../../redux/slices/appSlice';

const mockStore = configureStore([]);

describe('Log Component', () => {
  const testMessage = 'Test log message';
  const timestamp = new Date().toISOString();

  it('should render info log correctly', () => {
    const store = mockStore({
      app: {
        logs: [
          { message: testMessage, type: LogType.INFO, timestamp }
        ]
      }
    });

    render(
      <Provider store={store}>
        <Log open={true} onClose={() => {}} />
      </Provider>
    );
    expect(screen.getByText('Application Logs')).toBeInTheDocument();
    expect(screen.getByText('INFO')).toBeInTheDocument();
    const logElement = screen.getByText(testMessage);
    expect(logElement).toBeInTheDocument();
  });

  it('should render warning log correctly', () => {
    const store = mockStore({
      app: {
        logs: [
          { message: testMessage, type: LogType.WARNING, timestamp }
        ]
      }
    });

    render(
      <Provider store={store}>
        <Log open={true} onClose={() => {}} />
      </Provider>
    );
    expect(screen.getByText('WARNING')).toBeInTheDocument();
    const logElement = screen.getByText(testMessage);
    expect(logElement).toBeInTheDocument();
  });

  it('should render error log correctly', () => {
    const store = mockStore({
      app: {
        logs: [
          { message: testMessage, type: LogType.ERROR, timestamp }
        ]
      }
    });

    render(
      <Provider store={store}>
        <Log open={true} onClose={() => {}} />
      </Provider>
    );
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    const logElement = screen.getByText(testMessage);
    expect(logElement).toBeInTheDocument();
  });

  it('should render success log correctly', () => {
    const store = mockStore({
      app: {
        logs: [
          { message: testMessage, type: LogType.SUCCESS, timestamp }
        ]
      }
    });

    render(
      <Provider store={store}>
        <Log open={true} onClose={() => {}} />
      </Provider>
    );
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    const logElement = screen.getByText(testMessage);
    expect(logElement).toBeInTheDocument();
  });
});
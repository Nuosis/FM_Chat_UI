import React from 'react';
import { render, screen } from '@testing-library/react';
import Log from '../Log';
import { LogType } from '../../redux/slices/appSlice';

describe('Log Component', () => {
  const testMessage = 'Test log message';
  
  it('should render info log correctly', () => {
    render(<Log message={testMessage} type={LogType.INFO} />);
    expect(screen.getByText(testMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardInfo');
  });

  it('should render warning log correctly', () => {
    render(<Log message={testMessage} type={LogType.WARNING} />);
    expect(screen.getByText(testMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardWarning');
  });

  it('should render error log correctly', () => {
    render(<Log message={testMessage} type={LogType.ERROR} />);
    expect(screen.getByText(testMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  it('should render success log correctly', () => {
    render(<Log message={testMessage} type={LogType.SUCCESS} />);
    expect(screen.getByText(testMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardSuccess');
  });
});
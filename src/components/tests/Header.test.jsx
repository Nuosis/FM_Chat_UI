import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../Header';

describe('Header Component', () => {
  it('should render the header with correct title', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/FM Chat UI/i)).toBeInTheDocument();
  });

  it('should render the settings icon', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });
});
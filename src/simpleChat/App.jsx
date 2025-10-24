import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, useMediaQuery } from '@mui/material';
import LLMChat from './src/componenets/LLMChat';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = createTheme({
    palette: {
      mode: prefersDarkMode ? 'dark' : 'light',
      primary: {
        main: prefersDarkMode ? '#90caf9' : '#1976d2',
      },
      secondary: {
        main: prefersDarkMode ? '#f48fb1' : '#dc004e',
      },
      error: {
        main: '#f44336',
      },
      background: {
        default: prefersDarkMode ? '#121212' : '#fff',
        paper: prefersDarkMode ? '#1e1e1e' : '#fff',
      },
      text: {
        primary: prefersDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.87)',
        secondary: prefersDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}>
        <LLMChat />
      </Box>
    </ThemeProvider>
  );
}

export default App;
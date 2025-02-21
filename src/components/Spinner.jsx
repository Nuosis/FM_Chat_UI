import React from 'react';
import { Box, useTheme } from '@mui/material';
import { keyframes } from '@mui/system';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Spinner = ({ size = 40 }) => {
  const theme = useTheme();
  const gradientColor = theme.palette.secondary.main;
  const textColor = theme.palette.text.primary;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        py: 2
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: 4,
          borderStyle: 'solid',
          borderColor: `${textColor} ${gradientColor} ${textColor} ${textColor}`,
          animation: `${spin} 1s linear infinite`,
        }}
      />
    </Box>
  );
};

export default Spinner;
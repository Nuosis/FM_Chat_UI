import { Box, Paper, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { clearLogs } from '../redux/slices/appSlice';

const Log = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const logs = useSelector(state => state.app.logs);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle>
        Application Logs
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {logs.map((log, index) => (
            <Paper
              key={index}
              elevation={1}
              sx={(theme) => ({
                p: 1.5,
                bgcolor: log.type === 'error' ? 'error.light' :
                         log.type === 'warning' ? 'warning.light' :
                         log.type === 'success' ? 'success.light' :
                         log.type === 'debug' ?
                           theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'
                           : 'background.default',
                color: log.type === 'error' ? 'error.contrastText' :
                       log.type === 'debug' ? 'text.secondary' : 'text.primary',
                '& .MuiTypography-caption': {
                  color: log.type === 'debug' ? 'text.disabled' : 'text.secondary'
                }
              })}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  {new Date(log.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {log.type.toUpperCase()}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {log.message}
              </Typography>
            </Paper>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{ color: 'primary.main' }}
        >
          Close
        </Button>
        <Button
          onClick={() => {
            dispatch(clearLogs());
          }}
          sx={{ color: 'error.main' }}
        >
          Clear Logs
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Log;
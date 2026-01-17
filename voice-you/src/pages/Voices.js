import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import s3Service from '../services/s3Service';

const Voices = () => {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingUrl, setPlayingUrl] = useState(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await s3Service.listVoices();
      setVoices(response);
    } catch (err) {
      setError(err.message || 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (url) => {
    if (playingUrl === url) {
      // Stop playing
      setPlayingUrl(null);
    } else {
      // Play voice
      const audio = new Audio(url);
      audio.play();
      setPlayingUrl(url);
      audio.onended = () => setPlayingUrl(null);
    }
  };

  const handleDownload = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
          📁 Your Voices
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Browse all your uploaded voice recordings from S3 bucket
        </Typography>

        {voices.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Chip
              label={`Total: ${voices.length} voice${voices.length !== 1 ? 's' : ''}`}
              color="primary"
              variant="outlined"
            />
            <Button
              variant="outlined"
              onClick={fetchVoices}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : voices.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No voices yet
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Upload your first voice recording to get started! 🎙️
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>File Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  Size
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Uploaded</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voices.map((voice, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {voice.file_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="textSecondary">
                      {formatFileSize(voice.size)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {formatDate(voice.last_modified)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={playingUrl === voice.url ? 'Stop' : 'Play'}>
                      <IconButton
                        size="small"
                        onClick={() => handlePlay(voice.url)}
                        color={playingUrl === voice.url ? 'primary' : 'default'}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(voice.url, voice.file_name)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default Voices;

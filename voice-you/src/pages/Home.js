import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';

function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <MicIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Record Voice',
      description: 'Easily record your voice with a simple click of a button.',
    },
    {
      icon: <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Upload to S3',
      description: 'Securely upload your voice recordings to AWS S3 bucket.',
    },
    {
      icon: <StorageIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Store & Access',
      description: 'Access your recordings anytime, anywhere from S3.',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" component="h1" sx={{ mb: 2, fontWeight: 'bold' }}>
          🎤 Welcome to Voice You
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Record your voice and upload it securely to AWS S3
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/your-voice')}
          startIcon={<MicIcon />}
        >
          Start Recording
        </Button>
      </Box>

      {/* Features Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" sx={{ mb: 4, textAlign: 'center', fontWeight: 'bold' }}>
          Features
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ textAlign: 'center', flex: 1 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ mb: 8, p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          How It Works
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          1. <strong>Navigate to Your Voice</strong> - Click on "Your Voice" in the menu
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          2. <strong>Record</strong> - Click the "Start Recording" button and speak into your microphone
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          3. <strong>Review</strong> - Listen to your recording or download it
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          4. <strong>Upload</strong> - Click "Upload to S3" to store your voice recording
        </Typography>
        <Typography variant="body1">
          5. <strong>Done!</strong> - Your voice is now securely stored on AWS S3
        </Typography>
      </Box>

      {/* About Section */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          About Voice You
        </Typography>
        <Typography variant="body1">
          Voice You is a modern web application built with React and Material UI that allows you to record your voice
          and upload it securely to AWS S3. The application uses the Web Audio API for recording and integrates with
          a FastAPI backend for reliable S3 upload functionality.
        </Typography>
      </Box>
    </Container>
  );
}

export default Home;

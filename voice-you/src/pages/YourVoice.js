import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import VoiceRecorder from '../components/VoiceRecorder';

function YourVoice() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Your Voice
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Record and upload your voice to S3. Use the recorder below to capture your voice,
          then upload it to your AWS S3 bucket.
        </Typography>
      </Box>
      <VoiceRecorder />
    </Container>
  );
}

export default YourVoice;

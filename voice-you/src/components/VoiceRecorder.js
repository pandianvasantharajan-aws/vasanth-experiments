import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { uploadAudioToS3 } from '../services/s3Service';

function VoiceRecorder() {
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);
  const canvasRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);
  const [uploadedUrl, setUploadedUrl] = useState('');

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context and analyzer for visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const analyzer = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);
      
      analyzerRef.current = analyzer;
      analyzer.fftSize = 256;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setMessage({ type: '', text: '' });
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start visualization
      visualizeAudio();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to access microphone' });
    }
  };

  const visualizeAudio = () => {
    if (!canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyzer = analyzerRef.current;
    const dataArray = dataArrayRef.current;

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      
      analyzer.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgb(200, 200, 200)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(200, 0, 0)';
      ctx.beginPath();
      
      const sliceWidth = (canvas.width * 1.0) / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    
    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) {
      setMessage({ type: 'error', text: 'No audio to upload' });
      return;
    }

    setIsLoading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `voice_${timestamp}.wav`;
      
      const response = await uploadAudioToS3(audioBlob, fileName);
      
      setMessage({ 
        type: 'success', 
        text: `Audio uploaded successfully! File: ${response.file_name}` 
      });
      setUploadedUrl(response.s3_url);
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Upload failed: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePlayback = () => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.play();
  };

  const handleReset = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setMessage({ type: '', text: '' });
    setUploadedUrl('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardHeader title="🎤 Voice Recorder" />
      <CardContent>
        {/* Visualization Canvas */}
        <Box sx={{ mb: 3 }}>
          <canvas
            ref={canvasRef}
            width={500}
            height={150}
            style={{ width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </Box>

        {/* Recording Status */}
        {isRecording && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <FiberManualRecordIcon sx={{ color: 'error.main', animation: 'pulse 1s infinite' }} />
              <Typography variant="body1">Recording...</Typography>
            </Box>
            <Chip label={`Time: ${formatTime(recordingTime)}`} color="primary" />
          </Box>
        )}

        {/* Recording Controls */}
        <Stack direction="row" spacing={2} sx={{ mb: 3, justifyContent: 'center' }}>
          {!isRecording ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<FiberManualRecordIcon />}
              onClick={startRecording}
              disabled={audioBlob !== null}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={stopRecording}
            >
              Stop Recording
            </Button>
          )}
        </Stack>

        {/* Playback Controls */}
        {audioBlob && (
          <>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Recording saved! Duration: {formatTime(recordingTime)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePlayback}
                  size="small"
                >
                  Play
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<GetAppIcon />}
                  onClick={handleDownload}
                  size="small"
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={handleReset}
                  size="small"
                  color="error"
                >
                  Discard
                </Button>
              </Stack>
            </Box>

            {/* Upload Section */}
            <Box sx={{ mb: 3 }}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={isLoading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                onClick={handleUpload}
                disabled={isLoading}
                size="large"
              >
                {isLoading ? 'Uploading...' : 'Upload to S3'}
              </Button>
            </Box>
          </>
        )}

        {/* Messages */}
        {message.text && (
          <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Uploaded URL */}
        {uploadedUrl && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              S3 URL:
            </Typography>
            <Typography
              variant="caption"
              component="div"
              sx={{
                wordBreak: 'break-all',
                p: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                fontFamily: 'monospace',
              }}
            >
              {uploadedUrl}
            </Typography>
          </Alert>
        )}
      </CardContent>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Card>
  );
}

export default VoiceRecorder;

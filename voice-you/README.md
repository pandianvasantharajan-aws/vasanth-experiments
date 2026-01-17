# Voice You - React Application

A modern voice recording and S3 upload application built with React and Material UI.

## Features

- **Voice Recording**: Record your voice using the Web Audio API
- **Audio Visualization**: See real-time waveform while recording
- **Playback**: Listen to your recorded voice
- **Download**: Save your recording locally
- **S3 Upload**: Upload recordings securely to AWS S3 via FastAPI backend
- **Responsive Design**: Works on desktop and mobile devices
- **Material UI**: Beautiful and intuitive user interface

## Project Structure

```
voice-you/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navigation.js          # App navigation menu
│   │   └── VoiceRecorder.js       # Voice recording component
│   ├── pages/
│   │   ├── Home.js               # Home page
│   │   └── YourVoice.js          # Voice recording page
│   ├── services/
│   │   └── s3Service.js          # S3 upload API service
│   ├── App.js                    # Main app component
│   ├── index.js                  # Entry point
│   └── index.css                 # Global styles
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- FastAPI backend running on port 3000 (or configured URL)
- AWS credentials and S3 bucket configured in FastAPI backend

## Installation

1. **Navigate to the project directory**
   ```bash
   cd voice-you
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set the correct API URL:
   ```
   REACT_APP_API_URL=http://localhost:3000
   ```

## Running the Application

**Development Mode**
```bash
npm start
```

The application will open at `http://localhost:3000` (Note: This is different from the FastAPI backend port)

**Production Build**
```bash
npm build
```

## How to Use

1. **Home Page**: Learn about the application features
2. **Your Voice Section**:
   - Click "Start Recording" to begin recording your voice
   - Speak into your microphone - you'll see the waveform visualization
   - Click "Stop Recording" when done
   - Review your recording:
     - Click "Play" to listen to the recording
     - Click "Download" to save it locally
     - Click "Discard" to delete it and start over
   - Click "Upload to S3" to upload your recording to AWS S3
   - Get the S3 URL for your uploaded file

## Dependencies

### Core Dependencies
- **react**: UI library
- **react-dom**: React DOM rendering
- **react-router-dom**: Client-side routing
- **@mui/material**: Material Design UI components
- **@mui/icons-material**: Material Design icons
- **@emotion/react**: CSS-in-JS styling
- **@emotion/styled**: Styled components
- **axios**: HTTP client for API requests

### Development Dependencies
- **react-scripts**: Build scripts and configuration

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Integration with FastAPI Backend

This application requires the `fastapi-s3-upload` backend to be running. The backend handles:
- S3 authentication
- File upload to S3
- URL generation for uploaded files

**Backend Setup**: See the `fastapi-s3-upload` project for setup instructions.

## API Endpoints Used

### Upload Audio
```
POST /api/upload
Content-Type: multipart/form-data

Request:
- file: Audio file (WAV format)

Response:
{
  "message": "File uploaded successfully",
  "file_name": "voice_2024-01-17T18-30-45-123.wav",
  "file_key": "uploads/voice_2024-01-17T18-30-45-123.wav",
  "file_size": 123456,
  "s3_url": "https://bucket.s3.region.amazonaws.com/uploads/...",
  "uploaded_at": "2024-01-17T18:30:45.123456"
}
```

### Health Check
```
GET /health

Response:
{
  "status": "healthy"
}
```

## Environment Variables

- `REACT_APP_API_URL`: The URL of the FastAPI backend (default: http://localhost:3000)

## Troubleshooting

### Microphone Access Denied
- Check browser permissions for microphone access
- Ensure you're using HTTPS (or localhost) for security reasons
- Try a different browser

### Upload Fails
- Verify the FastAPI backend is running
- Check the `REACT_APP_API_URL` in `.env` is correct
- Ensure AWS S3 credentials are configured in the FastAPI backend

### Empty Audio File
- Check that your microphone is working
- Try recording again
- Check browser console for errors

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the project README and documentation
2. Review FastAPI backend logs for upload errors
3. Check browser console for frontend errors

# FastAPI S3 Upload Service

A production-ready FastAPI application for uploading files to AWS S3 buckets with Pydantic validation.

## Features

- **FastAPI**: Modern, fast web framework for building APIs
- **Pydantic**: Data validation using Python type annotations
- **AWS S3 Integration**: Upload files to S3 buckets using boto3
- **Structured Code**: Organized project structure with config, models, routes, and services
- **Error Handling**: Comprehensive error handling and validation
- **API Documentation**: Auto-generated interactive API docs with Swagger UI

## Project Structure

```
fastapi-s3-upload/
├── app/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Application settings and configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # Pydantic models for request/response
│   ├── routes/
│   │   ├── __init__.py
│   │   └── upload.py            # File upload endpoint
│   ├── services/
│   │   ├── __init__.py
│   │   └── s3_service.py        # S3 operations service
│   ├── __init__.py
│   └── main.py                  # FastAPI application setup
├── main.py                      # Entry point to run the application
├── requirements.txt             # Python dependencies
├── .env.example                 # Example environment variables
├── .gitignore                   # Git ignore file
└── README.md                    # This file
```

## Prerequisites

- Python 3.9 or higher
- AWS account with S3 bucket
- AWS credentials (Access Key ID and Secret Access Key)

## Installation

1. **Clone or create the project directory**

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -e .
   ```
   
   Or with development dependencies:
   ```bash
   pip install -e ".[dev]"
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your AWS credentials:
   ```
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-bucket-name
   DEBUG=True
   ```

## Running the Application

### Local Development

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Using Docker Compose

**Prerequisites:**
- Docker and Docker Compose installed
- `.env` file configured with AWS credentials

**Start the application:**
```bash
docker-compose up
```

**Start in detached mode:**
```bash
docker-compose up -d
```

**Stop the application:**
```bash
docker-compose down
```

**View logs:**
```bash
docker-compose logs -f fastapi-app
```

**Rebuild the image:**
```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`

### Interactive API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Upload File

**POST** `/api/upload`

Upload a file to the S3 bucket.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Parameter: `file` (required) - The file to upload

**Response (201 Created):**
```json
{
  "message": "File uploaded successfully",
  "file_name": "example.txt",
  "file_key": "uploads/example.txt",
  "file_size": 1024,
  "s3_url": "https://your-bucket.s3.us-east-1.amazonaws.com/uploads/example.txt",
  "uploaded_at": "2024-01-17T10:30:45.123456"
}
```

**Error Response (400/500):**
```json
{
  "error": "Bad Request",
  "detail": "File is empty"
}
```

### Health Check

**GET** `/health`

Check the health status of the service.

**Response:**
```json
{
  "status": "healthy"
}
```

### Root Endpoint

**GET** `/`

Get service information.

**Response:**
```json
{
  "message": "Welcome to FastAPI S3 Upload Service",
  "version": "1.0.0",
  "docs": "/docs",
  "openapi": "/openapi.json"
}
```

## Usage Examples

### Using cURL

```bash
curl -X POST "http://localhost:8000/api/upload" \
  -F "file=@/path/to/your/file.txt"
```

### Using Python requests

```python
import requests

with open("file.txt", "rb") as f:
    files = {"file": f}
    response = requests.post("http://localhost:8000/api/upload", files=files)
    print(response.json())
```

### Using JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("http://localhost:8000/api/upload", {
  method: "POST",
  body: formData
});

const data = await response.json();
console.log(data);
```

## Configuration

### Environment Variables

- **AWS_ACCESS_KEY_ID**: Your AWS access key ID
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret access key
- **AWS_REGION**: AWS region (default: us-east-1)
### Production Dependencies

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **pydantic**: Data validation library
- **pydantic-settings**: Settings management
- **boto3**: AWS SDK for Python
- **python-multipart**: Multipart form data support
- **python-dotenv**: Environment variable loading

### Development Dependencies

- **pytest**: Testing framework
- **pytest-asyncio**: Async test support
- **httpx**: HTTP client for testing
- **black**: Code formatter
- **flake8**: Linter
- **isort**: Import sorter
- **ocker Deployment

### Build and Run Locally

**Build the image:**
```bash
docker build -t fastapi-s3-upload:latest .
```

**Run the container:**
```bash
docker run -p 8000:8000 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=us-east-1 \
  -e S3_BUCKET_NAME=your-bucket \
  fastapi-s3-upload:latest
```

### Docker Compose Configuration

The `docker-compose.yml` includes:
- Automatic environment variable loading from `.env`
- Health checks for container monitoring
- Volume mounting for development (hot reload)
- Networking for multi-container setups
- Auto-restart policy

## Production Deployment

For production deployment:

1. **Set `DEBUG=False`** in `.env`
2. **Docker considerations:**
   - Use a multi-stage build to reduce image size
   - Consider using a reverse proxy (Nginx) in front of the app
   - Set up proper logging with Docker log drivers
   - Use environment-specific docker-compose files
3. **Environment-specific configuration**
   - Create separate `.env.production` file
   - Use Docker secrets for sensitive data
4. **SSL/TLS certificates:**
   - Configure Nginx or other reverse proxy with SSL
   - Use Let's Encrypt for free certificates
5. **Scaling:**
   - Add load balancer configuration
   - Use container orchestration (Kubernetes) for large deployment
- **400 Bad Request**: Invalid or missing file
- **500 Internal Server Error**: S3 upload or server error

All errors return a structured ErrorResponse with error message and details.

## Security Considerations

1. **Environment Variables**: Store AWS credentials in `.env` file (never commit to version control)
2. **CORS**: Currently allows all origins - configure as needed for production
3. **File Validation**: Validate file types and sizes before uploading
4. **S3 Bucket Policy**: Configure appropriate bucket policies for access control
5. **Rate Limiting**: Consider adding rate limiting middleware for production

## Development

To run in development mode with auto-reload:

```bash
python main.py
```

The server will reload automatically when you make changes to the code.

## Deployment

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Use a production ASGI server like Gunicorn with Uvicorn workers:
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
   ```
3. Use environment-specific configuration
4. Set up proper logging
5. Configure SSL/TLS certificates

## License

This project is open source and available under the MIT License.

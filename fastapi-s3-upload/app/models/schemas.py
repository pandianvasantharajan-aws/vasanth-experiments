from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FileUploadResponse(BaseModel):
    """Response model for file upload"""
    
    message: str = Field(..., description="Response message")
    file_name: str = Field(..., description="Name of the uploaded file")
    file_key: str = Field(..., description="S3 object key")
    file_size: int = Field(..., description="File size in bytes")
    s3_url: str = Field(..., description="Public S3 URL of the file")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")


class ErrorResponse(BaseModel):
    """Error response model"""
    
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")

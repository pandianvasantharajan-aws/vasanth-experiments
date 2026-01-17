from fastapi import APIRouter, UploadFile, File, HTTPException, status
from botocore.exceptions import ClientError
from app.models.schemas import FileUploadResponse, ErrorResponse
from app.services.s3_service import s3_service
from typing import List, Dict

router = APIRouter(prefix="/api", tags=["uploads"])


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def upload_file(file: UploadFile = File(...)) -> FileUploadResponse:
    """
    Upload a file to S3 bucket
    
    - **file**: The file to upload (multipart/form-data)
    
    Returns:
        FileUploadResponse with file details and S3 URL
    """
    
    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Upload to S3
        file_key, s3_url = s3_service.upload_file(
            file_content=file_content,
            file_name=file.filename
        )
        
        # Return response
        return FileUploadResponse(
            message="File uploaded successfully",
            file_name=file.filename,
            file_key=file_key,
            file_size=len(file_content),
            s3_url=s3_url
        )
        
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to S3: {error_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get(
    "/voices",
    response_model=List[Dict],
    status_code=status.HTTP_200_OK,
    responses={500: {"model": ErrorResponse}}
)
async def list_voices() -> List[Dict]:
    """
    List all uploaded voices from S3 bucket
    
    Returns:
        List of voice files with metadata (file_name, size, last_modified, url)
    """
    
    try:
        # List files from S3 uploads folder
        voices = s3_service.list_files(prefix="uploads/")
        return voices
        
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve voices from S3: {error_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
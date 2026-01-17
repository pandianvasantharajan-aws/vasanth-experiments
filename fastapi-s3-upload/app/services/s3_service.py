import boto3
from botocore.exceptions import ClientError
from app.config.settings import settings
from typing import Tuple


class S3Service:
    """Service for handling S3 operations"""
    
    def __init__(self):
        """Initialize S3 client"""
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )
        self.bucket_name = settings.s3_bucket_name
    
    def upload_file(self, file_content: bytes, file_name: str) -> Tuple[str, str]:
        """
        Upload a file to S3 bucket
        
        Args:
            file_content: File content as bytes
            file_name: Name of the file
            
        Returns:
            Tuple of (file_key, s3_url)
            
        Raises:
            ClientError: If S3 upload fails
        """
        try:
            # Generate S3 key
            file_key = f"uploads/{file_name}"
            
            # Upload file to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content
            )
            
            # Generate S3 URL
            s3_url = f"https://{self.bucket_name}.s3.{settings.aws_region}.amazonaws.com/{file_key}"
            
            return file_key, s3_url
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            raise ClientError(
                error_response={"Error": {"Code": error_code, "Message": str(e)}},
                operation_name="PutObject"
            )
    
    def delete_file(self, file_key: str) -> bool:
        """
        Delete a file from S3 bucket
        
        Args:
            file_key: S3 object key
            
        Returns:
            True if deletion was successful
            
        Raises:
            ClientError: If S3 deletion fails
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            return True
        except ClientError as e:
            raise ClientError(
                error_response={"Error": {"Code": "DeleteError", "Message": str(e)}},
                operation_name="DeleteObject"
            )


# Create singleton instance
s3_service = S3Service()

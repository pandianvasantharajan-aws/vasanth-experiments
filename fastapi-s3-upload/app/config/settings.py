from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # AWS Configuration
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "us-east-1"
    s3_bucket_name: str
    
    # FastAPI Configuration
    debug: bool = False
    app_name: str = "FastAPI S3 Upload"
    app_version: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

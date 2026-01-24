from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "Agent Company LDA"
    DEBUG: bool = True
    PORT: int = 8001
    HOST: str = "127.0.0.1"
    
    # Security
    LDA_SECRET_KEY: str = "your-lda-secret-key-change-me"
    ALLOWED_HOSTS: List[str] = ["127.0.0.1", "localhost"]
    
    # Filesystem
    WRITABLE_ROOTS: List[str] = [os.getcwd()]
    TRASH_DIR: str = ".lda_trash"
    
    class Config:
        env_file = ".env"

settings = Settings()

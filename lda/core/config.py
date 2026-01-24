from pydantic_settings import BaseSettings
from typing import List, Optional
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

    # LLM API Keys
    GOOGLE_API_KEY: Optional[str] = ""
    OPENAI_API_KEY: Optional[str] = ""

    # Backend URL for callbacks
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


settings = Settings()

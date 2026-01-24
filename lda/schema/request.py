from pydantic import BaseModel
from typing import List, Optional

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None
    timeout: Optional[int] = 60

class FileReadRequest(BaseModel):
    path: str

class FileWriteRequest(BaseModel):
    path: str
    content: str

class ListDirRequest(BaseModel):
    path: str

class GitStatusRequest(BaseModel):
    path: str

class GitDiffRequest(BaseModel):
    path: str
    staged: Optional[bool] = False

class GitCommitRequest(BaseModel):
    path: str
    message: str
    files: Optional[List[str]] = None

class GitWorktreeAddRequest(BaseModel):
    repo_path: str
    worktree_path: str
    branch_name: str
    base: Optional[str] = "main"

class GitWorktreeRemoveRequest(BaseModel):
    repo_path: str
    worktree_path: str

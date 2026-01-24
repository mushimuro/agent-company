from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None
    timeout: Optional[int] = 60


# PM Agent Requests
class PMDecomposeRequest(BaseModel):
    project_name: str
    project_description: Optional[str] = ""
    repo_path: str
    requirements: str
    model: Optional[str] = "gemini-2.5-flash"


# Agent Execution Requests
class TaskContext(BaseModel):
    task_id: str
    task_title: str
    task_description: str
    acceptance_criteria: Optional[List[str]] = []
    agent_role: str
    project_name: str
    project_description: Optional[str] = ""
    repo_path: str
    model: Optional[str] = "gemini-2.5-flash"


class AgentRunRequest(BaseModel):
    attempt_id: str
    task: Dict[str, Any]
    project: Dict[str, Any]
    writable_roots: List[str] = []
    model: Optional[str] = "gemini-2.5-flash"


# Git Merge Requests
class GitMergeRequest(BaseModel):
    repo_path: str
    branch_name: str
    target_branch: Optional[str] = "main"


class GitCleanupRequest(BaseModel):
    repo_path: str
    worktree_path: str


# Quality Gates Request
class QualityGatesRequest(BaseModel):
    repo_path: str

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

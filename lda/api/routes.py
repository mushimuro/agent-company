from fastapi import APIRouter, Depends, HTTPException
from schema.request import (
    CommandRequest, FileReadRequest, FileWriteRequest, 
    ListDirRequest, GitStatusRequest, GitDiffRequest, GitCommitRequest,
    GitWorktreeAddRequest, GitWorktreeRemoveRequest
)
from services.shell import ShellService
from services.filesystem import FilesystemService
from services.git_service import GitService
from core.security import signature_required

router = APIRouter(dependencies=[Depends(signature_required)])

@router.post("/shell/execute")
async def execute_command(req: CommandRequest):
    code, stdout, stderr = ShellService.execute(req.command, req.cwd, req.timeout)
    return {"code": code, "stdout": stdout, "stderr": stderr}

@router.post("/files/read")
async def read_file(req: FileReadRequest):
    try:
        content = FilesystemService.read_file(req.path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/files/write")
async def write_file(req: FileWriteRequest):
    try:
        FilesystemService.write_file(req.path, req.content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/files/list")
async def list_dir(req: ListDirRequest):
    try:
        entries = FilesystemService.list_dir(req.path)
        return {"entries": entries}
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/files/delete")
async def delete_file(req: FileReadRequest): # Reuse FileReadRequest as it just needs Path
    try:
        trash_path = FilesystemService.delete_safe(req.path)
        return {"status": "success", "trash_path": trash_path}
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/git/status")
async def git_status(req: GitStatusRequest):
    try:
        status = GitService.get_status(req.path)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/git/diff")
async def git_diff(req: GitDiffRequest):
    try:
        diff = GitService.get_diff(req.path, req.staged)
        return {"diff": diff}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/git/commit")
async def git_commit(req: GitCommitRequest):
    try:
        GitService.commit(req.path, req.message, req.files)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/git/worktree/add")
async def git_worktree_add(req: GitWorktreeAddRequest):
    try:
        path = GitService.add_worktree(req.repo_path, req.worktree_path, req.branch_name, req.base)
        return {"status": "success", "path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/git/worktree/remove")
async def git_worktree_remove(req: GitWorktreeRemoveRequest):
    try:
        GitService.remove_worktree(req.repo_path, req.worktree_path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

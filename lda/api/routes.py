from fastapi import APIRouter, Depends, HTTPException
from schema.request import (
    CommandRequest, FileReadRequest, FileWriteRequest,
    ListDirRequest, GitStatusRequest, GitDiffRequest, GitCommitRequest,
    GitWorktreeAddRequest, GitWorktreeRemoveRequest,
    PMDecomposeRequest, AgentRunRequest, GitMergeRequest, GitCleanupRequest,
    QualityGatesRequest
)
from services.shell import ShellService
from services.filesystem import FilesystemService
from services.git_service import GitService
from core.security import signature_required
from core.config import settings

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


# ============================================================
# PM Agent Endpoints
# ============================================================

@router.post("/pm/decompose")
async def pm_decompose(req: PMDecomposeRequest):
    """
    PM Agent decomposes requirements into tasks.
    """
    try:
        from services.agents import PMAgent, BaseAgent

        # Get API key based on model
        if "gemini" in req.model.lower():
            api_key = settings.GOOGLE_API_KEY
        else:
            api_key = settings.OPENAI_API_KEY

        if not api_key:
            raise HTTPException(
                status_code=500,
                detail=f"API key not configured for model: {req.model}"
            )

        # Initialize PM Agent
        agent = PMAgent(model_name=req.model, api_key=api_key)

        # Get file tree
        file_tree = agent.get_file_tree(req.repo_path)

        # Decompose requirements
        tasks = await agent.decompose_requirements(
            project_name=req.project_name,
            project_description=req.project_description or "",
            user_requirements=req.requirements,
            file_tree=file_tree
        )

        return {"tasks": tasks}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Agent Execution Endpoints
# ============================================================

@router.post("/agent/run")
async def agent_run(req: AgentRunRequest):
    """
    Execute a specialized agent task.
    Creates worktree, runs agent, generates diff.
    """
    try:
        from services.agents import (
            FrontendAgent, BackendAgent, QAAgent, DevOpsAgent,
            ExecutionContext
        )
        from services.quality_gates import QualityGateRunner

        # Select agent based on role
        role = req.task.get('agent_role', 'BACKEND')
        agent_map = {
            'FRONTEND': FrontendAgent,
            'BACKEND': BackendAgent,
            'QA': QAAgent,
            'DEVOPS': DevOpsAgent,
        }

        if role not in agent_map:
            raise HTTPException(status_code=400, detail=f"Unknown agent role: {role}")

        # Get API key
        model = req.model or "gemini-2.5-flash"
        if "gemini" in model.lower():
            api_key = settings.GOOGLE_API_KEY
        else:
            api_key = settings.OPENAI_API_KEY

        if not api_key:
            raise HTTPException(
                status_code=500,
                detail=f"API key not configured for model: {model}"
            )

        # Create worktree
        repo_path = req.project.get('repo_path')
        task_id = req.task.get('id', req.attempt_id)
        worktree_name = f"worktree-{role.lower()}-{task_id[:8]}"

        import os
        worktree_path = os.path.join(os.path.dirname(repo_path), worktree_name)
        branch_name = f"agent-{role.lower()}-{task_id[:8]}"

        # Add worktree
        try:
            GitService.add_worktree(repo_path, worktree_path, branch_name, "main")
        except Exception as e:
            # Worktree might already exist, try to remove and recreate
            try:
                GitService.remove_worktree(repo_path, worktree_path)
                GitService.add_worktree(repo_path, worktree_path, branch_name, "main")
            except:
                raise HTTPException(status_code=500, detail=f"Failed to create worktree: {e}")

        # Initialize agent
        AgentClass = agent_map[role]
        agent = AgentClass(model_name=model, api_key=api_key)

        # Build execution context
        context = ExecutionContext(
            task_id=task_id,
            task_title=req.task.get('title', ''),
            task_description=req.task.get('description', ''),
            acceptance_criteria=req.task.get('acceptance_criteria', []),
            project_name=req.project.get('name', ''),
            project_description=req.project.get('description', ''),
            repo_path=repo_path,
            worktree_path=worktree_path,
            file_tree=agent.get_file_tree(worktree_path),
            writable_roots=req.writable_roots,
            model=model
        )

        # Execute agent
        result = await agent.execute(context)

        if result.success and result.files_changed:
            # Commit changes
            try:
                GitService.commit(
                    worktree_path,
                    result.commit_message or f"Agent work: {context.task_title}",
                    result.files_changed
                )
            except Exception as e:
                # Might fail if no changes, that's okay
                pass

        # Generate diff
        diff = ""
        try:
            diff = GitService.get_diff(worktree_path, staged=False)
            if not diff:
                # Try diff against main
                from git import Repo
                repo = Repo(worktree_path)
                diff = repo.git.diff("main")
        except:
            pass

        # Run quality gates
        gate_results = None
        if result.success:
            try:
                gate_results = await QualityGateRunner.run_all_gates(worktree_path)
            except:
                pass

        return {
            "success": result.success,
            "git_branch": branch_name,
            "worktree_path": worktree_path,
            "diff": diff,
            "error": result.error,
            "files_changed": result.files_changed,
            "gate_results": gate_results,
            "output": result.output[:5000] if result.output else ""
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Git Merge/Cleanup Endpoints
# ============================================================

@router.post("/git/merge")
async def git_merge(req: GitMergeRequest):
    """Merge a branch into target branch."""
    try:
        from git import Repo

        repo = Repo(req.repo_path)

        # Checkout target branch
        repo.git.checkout(req.target_branch)

        # Merge
        try:
            repo.git.merge(req.branch_name, '--no-ff', '-m', f'Merge {req.branch_name}')
            return {
                "success": True,
                "message": f"Successfully merged {req.branch_name} into {req.target_branch}"
            }
        except Exception as e:
            if 'CONFLICT' in str(e):
                # Abort merge on conflict
                repo.git.merge('--abort')
                return {
                    "success": False,
                    "error": f"Merge conflict detected: {str(e)}"
                }
            raise

    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/git/cleanup")
async def git_cleanup(req: GitCleanupRequest):
    """Remove worktree and cleanup."""
    try:
        import shutil
        import os

        # Try git worktree remove first
        try:
            GitService.remove_worktree(req.repo_path, req.worktree_path)
        except:
            # Fallback: manual removal
            if os.path.exists(req.worktree_path):
                shutil.rmtree(req.worktree_path)

        return {"success": True, "message": "Worktree removed"}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================
# Quality Gates Endpoints
# ============================================================

@router.post("/quality/run")
async def run_quality_gates(req: QualityGatesRequest):
    """Run quality gates (tests and linting) on a repository."""
    try:
        from services.quality_gates import QualityGateRunner

        results = await QualityGateRunner.run_all_gates(req.repo_path)
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

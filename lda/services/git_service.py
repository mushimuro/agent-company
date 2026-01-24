from git import Repo
import os
from typing import List, Optional

class GitService:
    @staticmethod
    def get_repo(path: str) -> Repo:
        return Repo(path, search_parent_directories=True)

    @staticmethod
    def get_status(path: str) -> dict:
        repo = GitService.get_repo(path)
        return {
            "branch": repo.active_branch.name,
            "is_dirty": repo.is_dirty(),
            "untracked": [f for f in repo.untracked_files],
            "modified": [item.a_path for item in repo.index.diff(None)],
            "staged": [item.a_path for item in repo.index.diff("HEAD")]
        }

    @staticmethod
    def get_diff(path: str, staged: bool = False) -> str:
        repo = GitService.get_repo(path)
        if staged:
            return repo.git.diff("--cached")
        return repo.git.diff()

    @staticmethod
    def commit(path: str, message: str, files: List[str] = None):
        repo = GitService.get_repo(path)
        if files:
            repo.index.add(files)
        else:
            repo.git.add(A=True)
        
        return repo.index.commit(message)

    @staticmethod
    def create_branch(path: str, branch_name: str, base: str = "main"):
        repo = GitService.get_repo(path)
        new_branch = repo.create_head(branch_name, base)
        new_branch.checkout()
        return branch_name

    @staticmethod
    def add_worktree(repo_path: str, worktree_path: str, branch_name: str, base: str = "main"):
        """
        Added a new worktree for a specific branch.
        """
        repo = GitService.get_repo(repo_path)
        # git worktree add <path> -b <new-branch> <base>
        repo.git.worktree("add", worktree_path, "-b", branch_name, base)
        return worktree_path

    @staticmethod
    def remove_worktree(repo_path: str, worktree_path: str):
        """
        Remove a worktree and its cached information.
        """
        repo = GitService.get_repo(repo_path)
        repo.git.worktree("remove", worktree_path)
        # Prune stale worktrees
        repo.git.worktree("prune")
        return True

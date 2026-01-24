import os
import shutil
import time
from pathlib import Path
from typing import List, Optional
from core.config import settings

class FilesystemService:
    @staticmethod
    def is_safe_path(path_str: str, write: bool = False) -> bool:
        """
        Check if a path is safe to access/write.
        If write=True, the path MUST be inside one of the WRITABLE_ROOTS.
        If write=False, for now we also restrict to roots for safety, 
        but could be expanded later.
        """
        try:
            # Resolve to absolute real path (handling symlinks, .. etc)
            target_path = Path(path_str).resolve()
            
            # Check if it starts with any of the allowed roots
            for root in settings.WRITABLE_ROOTS:
                root_path = Path(root).resolve()
                if target_path == root_path or root_path in target_path.parents:
                    return True
            
            return False
        except Exception:
            return False

    @staticmethod
    def read_file(path: str) -> str:
        if not FilesystemService.is_safe_path(path):
            raise Exception(f"Access denied: {path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()

    @staticmethod
    def write_file(path: str, content: str):
        if not FilesystemService.is_safe_path(path, write=True):
            raise Exception(f"Write access denied: {path}")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    @staticmethod
    def list_dir(path: str) -> List[dict]:
        if not FilesystemService.is_safe_path(path):
            raise Exception(f"Access denied: {path}")
        
        results = []
        for entry in os.scandir(path):
            results.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if entry.is_file() else 0,
                "modified": entry.stat().st_mtime
            })
        return results

    @staticmethod
    def delete_safe(path: str):
        """Move to trash instead of permanent delete."""
        if not FilesystemService.is_safe_path(path, write=True):
            raise Exception(f"Write access denied: {path}")
        
        trash_dir = Path(settings.TRASH_DIR)
        trash_dir.mkdir(exist_ok=True)
        
        target = Path(path)
        dest = trash_dir / f"{target.name}_{int(time.time())}"
        
        shutil.move(str(target), str(dest))
        return str(dest)

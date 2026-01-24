import subprocess
import os
from typing import Tuple, Optional

class ShellService:
    @staticmethod
    def execute(command: str, cwd: Optional[str] = None, timeout: int = 60) -> Tuple[int, str, str]:
        """
        Execute a shell command and return (return_code, stdout, stderr).
        """
        try:
            # Use safer subprocess call
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=os.environ.copy()
            )
            
            try:
                stdout, stderr = process.communicate(timeout=timeout)
                return process.returncode, stdout, stderr
            except subprocess.TimeoutExpired:
                process.kill()
                stdout, stderr = process.communicate()
                return -1, stdout, "Command timed out after {} seconds".format(timeout)
                
        except Exception as e:
            return 1, "", str(e)

import requests
import hmac
import hashlib
import time
from typing import Dict, Any, Optional, List
from django.conf import settings


class LDAClient:
    """
    Client for communicating with the Local Desktop Agent (LDA).
    Handles authentication, request signing, and API interactions.
    """
    
    def __init__(self):
        self.base_url = settings.LDA_URL
        self.secret_key = settings.LDA_SECRET_KEY
        self.session = requests.Session()
    
    def _generate_signature(self, payload: str, timestamp: str) -> str:
        """Generate HMAC signature for request authentication"""
        message = timestamp.encode() + payload.encode()
        signature = hmac.new(
            self.secret_key.encode(),
            message,
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make authenticated request to LDA"""
        url = f"{self.base_url}{endpoint}"
        timestamp = str(int(time.time()))
        
        # Prepare payload
        import json
        payload = json.dumps(data) if data else ""
        
        # Generate signature
        signature = self._generate_signature(payload, timestamp)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Timestamp': timestamp,
            'X-Signature': signature
        }
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                'error': str(e),
                'success': False
            }
    
    def execute_command(
        self, 
        command: str, 
        cwd: str,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Execute a shell command via LDA
        
        Args:
            command: Command to execute
            cwd: Working directory
            timeout: Command timeout in seconds
        
        Returns:
            dict: Command execution result
        """
        return self._make_request('POST', '/api/execute', {
            'command': command,
            'cwd': cwd,
            'timeout': timeout
        })
    
    def read_file(self, file_path: str) -> Dict[str, Any]:
        """
        Read a file from the local filesystem
        
        Args:
            file_path: Absolute path to the file
        
        Returns:
            dict: File content and metadata
        """
        return self._make_request('POST', '/api/files/read', {
            'path': file_path
        })
    
    def write_file(
        self, 
        file_path: str, 
        content: str,
        create_dirs: bool = True
    ) -> Dict[str, Any]:
        """
        Write content to a file
        
        Args:
            file_path: Absolute path to the file
            content: File content
            create_dirs: Whether to create parent directories
        
        Returns:
            dict: Write operation result
        """
        return self._make_request('POST', '/api/files/write', {
            'path': file_path,
            'content': content,
            'create_dirs': create_dirs
        })
    
    def list_directory(self, dir_path: str) -> Dict[str, Any]:
        """
        List directory contents
        
        Args:
            dir_path: Absolute path to directory
        
        Returns:
            dict: Directory listing
        """
        return self._make_request('POST', '/api/files/list', {
            'path': dir_path
        })
    
    def git_status(self, repo_path: str) -> Dict[str, Any]:
        """
        Get git status for a repository
        
        Args:
            repo_path: Path to git repository
        
        Returns:
            dict: Git status information
        """
        return self._make_request('POST', '/api/git/status', {
            'repo_path': repo_path
        })
    
    def git_diff(self, repo_path: str, file_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Get git diff
        
        Args:
            repo_path: Path to git repository
            file_path: Optional specific file path
        
        Returns:
            dict: Git diff output
        """
        data = {'repo_path': repo_path}
        if file_path:
            data['file_path'] = file_path
        
        return self._make_request('POST', '/api/git/diff', data)
    
    def git_commit(
        self, 
        repo_path: str, 
        message: str,
        files: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a git commit
        
        Args:
            repo_path: Path to git repository
            message: Commit message
            files: Optional list of files to stage (None = all changes)
        
        Returns:
            dict: Commit result
        """
        data = {
            'repo_path': repo_path,
            'message': message
        }
        if files:
            data['files'] = files
        
        return self._make_request('POST', '/api/git/commit', data)
    
    def healthcheck(self) -> Dict[str, Any]:
        """
        Check if LDA is reachable and healthy
        
        Returns:
            dict: Health status
        """
        return self._make_request('GET', '/health')

"""
Agent Services for Task Decomposition and Execution.

This module provides:
- PMAgent: Decomposes requirements into tasks
- Specialized Agents: Frontend, Backend, QA, DevOps for task execution
"""

import os
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import google.generativeai as genai


@dataclass
class ExecutionContext:
    """Context information for agent execution."""
    task_id: str
    task_title: str
    task_description: str
    acceptance_criteria: List[str]
    project_name: str
    project_description: str
    repo_path: str
    worktree_path: str
    file_tree: str
    writable_roots: List[Dict[str, Any]]
    model: str


@dataclass
class FileChange:
    """Represents a file change from agent execution."""
    path: str
    content: str
    action: str = "create"  # create, modify, delete


@dataclass
class ExecutionResult:
    """Result from agent execution."""
    success: bool
    output: str
    error: Optional[str] = None
    files_changed: List[str] = field(default_factory=list)
    commit_message: Optional[str] = None


class BaseAgent(ABC):
    """Base class for all agents."""

    # Output format instructions for all agents
    OUTPUT_FORMAT = """
## Output Format

You MUST output your changes using the following format for each file:

### FILE: <relative/path/to/file.ext>
```<language>
<complete file content here>
```

For example:
### FILE: src/components/LoginForm.tsx
```tsx
import React from 'react';
// ... complete file content
```

IMPORTANT:
- Output the COMPLETE file content, not just snippets or diffs
- Use relative paths from the project root
- Include ALL files that need to be created or modified
- For modifications, output the entire updated file content
"""

    def __init__(self, model_name: str, api_key: str):
        self.model_name = model_name
        self.api_key = api_key
        self._setup_llm()

    def _setup_llm(self):
        """Setup LLM client based on model."""
        if "gemini" in self.model_name.lower():
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel(self.model_name)
            self.provider = "gemini"
        elif "glm" in self.model_name.lower():
            import openai
            self.client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://open.bigmodel.cn/api/paas/v4/"
            )
            self.provider = "openai"
        else:
            raise ValueError(f"Unsupported model: {self.model_name}")

    async def _call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Call LLM with prompt and return response."""
        if self.provider == "gemini":
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"
            else:
                full_prompt = prompt

            response = self.client.generate_content(full_prompt)
            return response.text

        elif self.provider == "openai":
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages
            )
            return response.choices[0].message.content

    def get_file_tree(self, path: str, max_depth: int = 3) -> str:
        """Generate a file tree representation."""
        def _build_tree(current_path: str, prefix: str = "", depth: int = 0) -> List[str]:
            if depth > max_depth:
                return []

            try:
                entries = []
                items = sorted(os.listdir(current_path))

                ignored = {'.git', '__pycache__', 'node_modules', 'venv', '.venv',
                          'dist', 'build', '.next', '.pytest_cache', 'coverage'}
                items = [i for i in items if i not in ignored and not i.startswith('.')]

                for idx, item in enumerate(items):
                    item_path = os.path.join(current_path, item)
                    is_last = idx == len(items) - 1
                    current_prefix = "└── " if is_last else "├── "
                    entries.append(f"{prefix}{current_prefix}{item}")

                    if os.path.isdir(item_path) and depth < max_depth:
                        extension = "    " if is_last else "│   "
                        entries.extend(_build_tree(item_path, prefix + extension, depth + 1))

                return entries
            except PermissionError:
                return []

        tree_lines = [path]
        tree_lines.extend(_build_tree(path))
        return "\n".join(tree_lines)

    def read_file(self, base_path: str, relative_path: str) -> Optional[str]:
        """Read a file from the worktree."""
        try:
            full_path = os.path.join(base_path, relative_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return None

    def parse_file_changes(self, llm_output: str) -> List[FileChange]:
        """
        Parse LLM output to extract file changes.

        Looks for patterns like:
        ### FILE: path/to/file.ext
        ```language
        content
        ```
        """
        changes = []

        # Pattern to match file blocks
        # Matches: ### FILE: path/to/file.ext followed by a code block
        pattern = r'###\s*FILE:\s*([^\n]+)\n```(?:\w+)?\n(.*?)```'

        matches = re.findall(pattern, llm_output, re.DOTALL | re.IGNORECASE)

        for file_path, content in matches:
            file_path = file_path.strip()
            content = content.strip()

            # Skip empty content
            if not content:
                continue

            # Normalize path separators
            file_path = file_path.replace('\\', '/')

            # Remove leading slash if present
            if file_path.startswith('/'):
                file_path = file_path[1:]

            changes.append(FileChange(
                path=file_path,
                content=content,
                action="create"
            ))

        return changes

    def write_files(self, base_path: str, changes: List[FileChange]) -> List[str]:
        """
        Write file changes to disk.

        Args:
            base_path: The worktree path
            changes: List of file changes to apply

        Returns:
            List of file paths that were written
        """
        written_files = []

        for change in changes:
            full_path = os.path.join(base_path, change.path)

            # Create directory if needed
            dir_path = os.path.dirname(full_path)
            if dir_path and not os.path.exists(dir_path):
                os.makedirs(dir_path, exist_ok=True)

            # Write file
            try:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(change.content)
                written_files.append(change.path)
                print(f"[Agent] Wrote file: {change.path}")
            except Exception as e:
                print(f"[Agent] Failed to write {change.path}: {e}")

        return written_files

    def get_relevant_files(self, base_path: str, extensions: List[str], max_files: int = 10) -> Dict[str, str]:
        """
        Get content of relevant existing files for context.

        Args:
            base_path: Project root path
            extensions: File extensions to include (e.g., ['.tsx', '.ts'])
            max_files: Maximum number of files to read

        Returns:
            Dict mapping file paths to their content
        """
        files = {}
        count = 0

        ignored_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv',
                       'dist', 'build', '.next', 'coverage'}

        for root, dirs, filenames in os.walk(base_path):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in ignored_dirs]

            for filename in filenames:
                if count >= max_files:
                    return files

                if any(filename.endswith(ext) for ext in extensions):
                    rel_path = os.path.relpath(os.path.join(root, filename), base_path)
                    try:
                        with open(os.path.join(root, filename), 'r', encoding='utf-8') as f:
                            content = f.read()
                            # Limit file size
                            if len(content) < 10000:
                                files[rel_path] = content
                                count += 1
                    except:
                        pass

        return files

    @abstractmethod
    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute the agent's task."""
        pass


class PMAgent(BaseAgent):
    """Project Manager Agent for task decomposition."""

    SYSTEM_PROMPT = """You are an expert Project Manager AI agent. Your role is to analyze project requirements and decompose them into clear, actionable tasks for specialized agents.

You must return ONLY a valid JSON array of tasks, with no additional text, markdown formatting, or explanations.

Each task must have:
- title: Clear, concise task name
- description: Detailed description of what needs to be done
- agent_role: One of: FRONTEND, BACKEND, QA, DEVOPS
- priority: Integer 1-10 (1=highest priority)
- acceptance_criteria: Array of specific, testable criteria
- dependencies: Array of task indices (0-based) that must complete first

Example response format:
[
  {
    "temp_id": "0",
    "title": "Setup database schema",
    "description": "Create PostgreSQL tables for users and posts",
    "agent_role": "BACKEND",
    "priority": 1,
    "acceptance_criteria": ["Tables created", "Migrations run successfully"],
    "dependencies": []
  }
]

Guidelines:
- Break down complex features into small, focused tasks
- Assign tasks to appropriate specialized agents
- Set realistic priorities and dependencies
- Make acceptance criteria specific and testable"""

    async def decompose_requirements(
        self,
        project_name: str,
        project_description: str,
        user_requirements: str,
        file_tree: str
    ) -> List[Dict[str, Any]]:
        """Decompose user requirements into tasks."""

        prompt = f"""Project: {project_name}
Description: {project_description}

Current File Structure:
{file_tree[:2000]}

User Requirements:
{user_requirements}

Analyze the requirements and create a comprehensive list of tasks. Return ONLY the JSON array."""

        response = await self._call_llm(prompt, self.SYSTEM_PROMPT)

        # Extract JSON from response
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()

        try:
            tasks = json.loads(response)
            return tasks
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response as JSON: {e}")

    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """PM Agent doesn't execute tasks directly."""
        return ExecutionResult(
            success=False,
            output="",
            error="PM Agent is for decomposition only, not execution"
        )


class FrontendAgent(BaseAgent):
    """Frontend Development Agent."""

    SYSTEM_PROMPT = """You are an expert Frontend Developer AI agent specializing in React and TypeScript.

Your task is to implement frontend features by writing actual code files.

Tech Stack:
- React 18+ with functional components and hooks
- TypeScript for type safety
- Tailwind CSS for styling
- React Query for data fetching (if needed)
- React Router for routing (if needed)

When implementing:
1. Write complete, working code files
2. Use TypeScript with proper types
3. Style with Tailwind CSS classes
4. Handle loading and error states
5. Make components accessible (aria labels, semantic HTML)
6. Follow React best practices

{output_format}"""

    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute frontend development task."""

        # Get existing relevant files for context
        existing_files = self.get_relevant_files(
            context.worktree_path,
            ['.tsx', '.ts', '.jsx', '.js', '.css'],
            max_files=8
        )

        existing_context = ""
        if existing_files:
            existing_context = "\n\n## Existing Files (for reference):\n"
            for path, content in existing_files.items():
                existing_context += f"\n### {path}\n```\n{content[:2000]}\n```\n"

        prompt = f"""## Task: {context.task_title}

## Description:
{context.task_description}

## Acceptance Criteria:
{chr(10).join(f"- {c}" for c in context.acceptance_criteria) if context.acceptance_criteria else "- Implement the feature as described"}

## Project: {context.project_name}
{context.project_description}

## Current File Structure:
{context.file_tree[:2000]}
{existing_context}

Now implement this task. Create all necessary files with complete, working code."""

        try:
            system_prompt = self.SYSTEM_PROMPT.format(output_format=self.OUTPUT_FORMAT)
            response = await self._call_llm(prompt, system_prompt)

            # Parse file changes from response
            changes = self.parse_file_changes(response)

            if not changes:
                return ExecutionResult(
                    success=False,
                    output=response,
                    error="No file changes detected in LLM response. The model may not have followed the output format."
                )

            # Write files
            written_files = self.write_files(context.worktree_path, changes)

            if not written_files:
                return ExecutionResult(
                    success=False,
                    output=response,
                    error="Failed to write any files"
                )

            return ExecutionResult(
                success=True,
                output=f"Created/modified {len(written_files)} files:\n" + "\n".join(f"- {f}" for f in written_files),
                files_changed=written_files,
                commit_message=f"feat: {context.task_title}"
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e)
            )


class BackendAgent(BaseAgent):
    """Backend Development Agent."""

    SYSTEM_PROMPT = """You are an expert Backend Developer AI agent specializing in Python and Django.

Your task is to implement backend features by writing actual code files.

Tech Stack:
- Python 3.9+
- Django with Django REST Framework
- PostgreSQL database
- Celery for async tasks (if needed)

When implementing:
1. Write complete, working code files
2. Follow Django conventions (models, views, serializers, urls)
3. Use proper error handling
4. Add input validation
5. Follow RESTful API design principles
6. Include docstrings

{output_format}"""

    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute backend development task."""

        existing_files = self.get_relevant_files(
            context.worktree_path,
            ['.py'],
            max_files=8
        )

        existing_context = ""
        if existing_files:
            existing_context = "\n\n## Existing Files (for reference):\n"
            for path, content in existing_files.items():
                existing_context += f"\n### {path}\n```python\n{content[:2000]}\n```\n"

        prompt = f"""## Task: {context.task_title}

## Description:
{context.task_description}

## Acceptance Criteria:
{chr(10).join(f"- {c}" for c in context.acceptance_criteria) if context.acceptance_criteria else "- Implement the feature as described"}

## Project: {context.project_name}
{context.project_description}

## Current File Structure:
{context.file_tree[:2000]}
{existing_context}

Now implement this task. Create all necessary files with complete, working code."""

        try:
            system_prompt = self.SYSTEM_PROMPT.format(output_format=self.OUTPUT_FORMAT)
            response = await self._call_llm(prompt, system_prompt)

            changes = self.parse_file_changes(response)

            if not changes:
                return ExecutionResult(
                    success=False,
                    output=response,
                    error="No file changes detected in LLM response"
                )

            written_files = self.write_files(context.worktree_path, changes)

            if not written_files:
                return ExecutionResult(
                    success=False,
                    output=response,
                    error="Failed to write any files"
                )

            return ExecutionResult(
                success=True,
                output=f"Created/modified {len(written_files)} files:\n" + "\n".join(f"- {f}" for f in written_files),
                files_changed=written_files,
                commit_message=f"feat: {context.task_title}"
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e)
            )


class QAAgent(BaseAgent):
    """Quality Assurance Agent."""

    SYSTEM_PROMPT = """You are an expert QA Engineer AI agent specializing in automated testing.

Your task is to write comprehensive tests for the codebase.

Testing Frameworks:
- Python: pytest with pytest-django
- JavaScript/TypeScript: Jest or Vitest
- E2E: Playwright or Cypress (if needed)

When writing tests:
1. Write complete test files
2. Cover happy paths and edge cases
3. Test error handling
4. Use descriptive test names
5. Follow testing best practices (AAA pattern)
6. Mock external dependencies

{output_format}"""

    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute QA testing task."""

        existing_files = self.get_relevant_files(
            context.worktree_path,
            ['.py', '.ts', '.tsx', '.js', '.jsx'],
            max_files=10
        )

        existing_context = ""
        if existing_files:
            existing_context = "\n\n## Files to Test:\n"
            for path, content in existing_files.items():
                if 'test' not in path.lower():
                    existing_context += f"\n### {path}\n```\n{content[:2000]}\n```\n"

        prompt = f"""## Task: {context.task_title}

## Description:
{context.task_description}

## Acceptance Criteria:
{chr(10).join(f"- {c}" for c in context.acceptance_criteria) if context.acceptance_criteria else "- Write comprehensive tests"}

## Project: {context.project_name}

## Current File Structure:
{context.file_tree[:2000]}
{existing_context}

Now write comprehensive tests. Create test files with complete, working test code."""

        try:
            system_prompt = self.SYSTEM_PROMPT.format(output_format=self.OUTPUT_FORMAT)
            response = await self._call_llm(prompt, system_prompt)

            changes = self.parse_file_changes(response)

            if not changes:
                return ExecutionResult(
                    success=False,
                    output=response,
                    error="No test files detected in LLM response"
                )

            written_files = self.write_files(context.worktree_path, changes)

            return ExecutionResult(
                success=len(written_files) > 0,
                output=f"Created {len(written_files)} test files:\n" + "\n".join(f"- {f}" for f in written_files),
                files_changed=written_files,
                commit_message=f"test: {context.task_title}"
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e)
            )


class DevOpsAgent(BaseAgent):
    """DevOps and Infrastructure Agent."""

    SYSTEM_PROMPT = """You are an expert DevOps Engineer AI agent specializing in CI/CD and infrastructure.

Your task is to create deployment and infrastructure configurations.

Technologies:
- Docker and Docker Compose
- GitHub Actions for CI/CD
- Kubernetes manifests (if needed)
- Nginx configurations
- Environment configuration

When implementing:
1. Write complete configuration files
2. Follow security best practices
3. Use environment variables for secrets
4. Include health checks
5. Document deployment steps

{output_format}"""

    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute DevOps task."""

        existing_files = self.get_relevant_files(
            context.worktree_path,
            ['.yml', '.yaml', '.dockerfile', '.sh', '.env.example'],
            max_files=5
        )

        existing_context = ""
        if existing_files:
            existing_context = "\n\n## Existing Config Files:\n"
            for path, content in existing_files.items():
                existing_context += f"\n### {path}\n```\n{content[:2000]}\n```\n"

        prompt = f"""## Task: {context.task_title}

## Description:
{context.task_description}

## Acceptance Criteria:
{chr(10).join(f"- {c}" for c in context.acceptance_criteria) if context.acceptance_criteria else "- Implement the configuration as described"}

## Project: {context.project_name}

## Current File Structure:
{context.file_tree[:2000]}
{existing_context}

Now implement this DevOps task. Create all necessary configuration files."""

        try:
            system_prompt = self.SYSTEM_PROMPT.format(output_format=self.OUTPUT_FORMAT)
            response = await self._call_llm(prompt, system_prompt)

            changes = self.parse_file_changes(response)

            if not changes:
                return ExecutionResult(
                    success=False,
                    output=response,
                    error="No configuration files detected in LLM response"
                )

            written_files = self.write_files(context.worktree_path, changes)

            return ExecutionResult(
                success=len(written_files) > 0,
                output=f"Created/modified {len(written_files)} config files:\n" + "\n".join(f"- {f}" for f in written_files),
                files_changed=written_files,
                commit_message=f"chore: {context.task_title}"
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e)
            )

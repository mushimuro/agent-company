"""
Agent Services for Task Decomposition and Execution.

This module provides:
- PMAgent: Decomposes requirements into tasks
- Specialized Agents: Frontend, Backend, QA, DevOps for task execution
"""

import os
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
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
class ExecutionResult:
    """Result from agent execution."""
    success: bool
    output: str
    error: Optional[str] = None
    files_changed: List[str] = None
    commit_message: Optional[str] = None

    def __post_init__(self):
        if self.files_changed is None:
            self.files_changed = []


class BaseAgent(ABC):
    """Base class for all agents."""
    
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
            # For GLM-7, we'll use OpenAI-compatible API
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
                
                # Filter out common ignored directories
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
  },
  {
    "temp_id": "1",
    "title": "Create user registration API",
    "description": "Implement POST /api/auth/register endpoint",
    "agent_role": "BACKEND",
    "priority": 2,
    "acceptance_criteria": ["Endpoint returns 201 on success", "Validates email format"],
    "dependencies": ["0"]
  }
]

Guidelines:
- Break down complex features into small, focused tasks
- Assign tasks to appropriate specialized agents
- Set realistic priorities and dependencies
- Make acceptance criteria specific and testable
- Consider the full development lifecycle (implementation, testing, deployment)"""
    
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
{file_tree[:2000]}  # Limit size

User Requirements:
{user_requirements}

Analyze the requirements and current project structure. Create a comprehensive list of tasks needed to implement these requirements. Return ONLY the JSON array, nothing else."""
        
        response = await self._call_llm(prompt, self.SYSTEM_PROMPT)
        
        # Extract JSON from response (handle potential markdown wrapping)
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
            raise ValueError(f"Failed to parse LLM response as JSON: {e}\nResponse: {response[:500]}")
    
    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """PM Agent doesn't execute tasks directly."""
        return ExecutionResult(
            success=False,
            output="",
            error="PM Agent is for decomposition only, not execution"
        )


class FrontendAgent(BaseAgent):
    """Frontend Development Agent."""
    
    SYSTEM_PROMPT = """You are an expert Frontend Developer AI agent specializing in React, TypeScript, and modern web development.

Your responsibilities:
- Implement React components with TypeScript
- Create responsive, accessible UI with Tailwind CSS
- Integrate with backend APIs
- Write clean, maintainable code
- Follow React best practices and hooks patterns

When given a task:
1. Analyze the current codebase structure
2. Identify files to create or modify
3. Implement the required functionality
4. Ensure code quality and consistency
5. Report what you did

You have access to:
- File reading and writing
- Running shell commands
- Git operations

Output format:
- Provide a summary of changes made
- List files created/modified
- Suggest a commit message"""
    
    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute frontend development task."""
        
        prompt = f"""Task: {context.task_title}

Description:
{context.task_description}

Acceptance Criteria:
{chr(10).join(f"- {criterion}" for criterion in context.acceptance_criteria)}

Project: {context.project_name}
Working Directory: {context.worktree_path}

Current File Structure:
{context.file_tree[:3000]}

Analyze the task and implement the required frontend functionality. Provide specific instructions on what files to create/modify and what code to write."""
        
        try:
            response = await self._call_llm(prompt, self.SYSTEM_PROMPT)
            
            # For now, return the LLM's response
            # TODO: Parse LLM response and actually execute file operations
            return ExecutionResult(
                success=True,
                output=response,
                files_changed=[],
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
    
    SYSTEM_PROMPT = """You are an expert Backend Developer AI agent specializing in Python, Django, FastAPI, and database design.

Your responsibilities:
- Implement REST APIs with proper error handling
- Design and optimize database schemas
- Write secure, scalable backend code
- Implement authentication and authorization
- Follow Python and Django best practices

When given a task:
1. Analyze the current backend structure
2. Identify models, views, serializers to create/modify
3. Implement the required functionality
4. Ensure proper validation and error handling
5. Report what you did

You have access to:
- File reading and writing
- Running shell commands (Django migrations, tests)
- Git operations

Output format:
- Provide a summary of changes made
- List files created/modified
- Suggest a commit message"""
    
    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute backend development task."""
        
        prompt = f"""Task: {context.task_title}

Description:
{context.task_description}

Acceptance Criteria:
{chr(10).join(f"- {criterion}" for criterion in context.acceptance_criteria)}

Project: {context.project_name}
Working Directory: {context.worktree_path}

Current File Structure:
{context.file_tree[:3000]}

Analyze the task and implement the required backend functionality. Provide specific instructions on what files to create/modify and what code to write."""
        
        try:
            response = await self._call_llm(prompt, self.SYSTEM_PROMPT)
            
            return ExecutionResult(
                success=True,
                output=response,
                files_changed=[],
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
    
    SYSTEM_PROMPT = """You are an expert QA Engineer AI agent specializing in automated testing and quality assurance.

Your responsibilities:
- Write comprehensive unit and integration tests
- Implement E2E tests for critical flows
- Review code for bugs and edge cases
- Ensure test coverage meets standards
- Validate acceptance criteria

When given a task:
1. Analyze the feature to test
2. Identify test scenarios and edge cases
3. Write test files (pytest, jest, etc.)
4. Run tests and report results
5. Document testing approach

You have access to:
- File reading and writing
- Running test commands
- Analyzing test coverage

Output format:
- Test files created
- Test results summary
- Coverage metrics"""
    
    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute QA testing task."""
        
        prompt = f"""Task: {context.task_title}

Description:
{context.task_description}

Acceptance Criteria:
{chr(10).join(f"- {criterion}" for criterion in context.acceptance_criteria)}

Project: {context.project_name}
Working Directory: {context.worktree_path}

Current File Structure:
{context.file_tree[:3000]}

Analyze the task and create comprehensive tests to verify the functionality. Provide specific instructions on what test files to create and what test cases to implement."""
        
        try:
            response = await self._call_llm(prompt, self.SYSTEM_PROMPT)
            
            return ExecutionResult(
                success=True,
                output=response,
                files_changed=[],
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
    
    SYSTEM_PROMPT = """You are an expert DevOps Engineer AI agent specializing in deployment, CI/CD, and infrastructure.

Your responsibilities:
- Configure CI/CD pipelines
- Create Docker configurations
- Set up deployment scripts
- Manage environment configurations
- Optimize build and deployment processes

When given a task:
1. Analyze infrastructure requirements
2. Create or modify deployment configs
3. Implement CI/CD workflows
4. Document setup procedures
5. Test deployment process

You have access to:
- File reading and writing
- Running Docker and shell commands
- Git operations

Output format:
- Configuration files created
- Deployment steps
- Documentation updates"""
    
    async def execute(self, context: ExecutionContext) -> ExecutionResult:
        """Execute DevOps task."""
        
        prompt = f"""Task: {context.task_title}

Description:
{context.task_description}

Acceptance Criteria:
{chr(10).join(f"- {criterion}" for criterion in context.acceptance_criteria)}

Project: {context.project_name}
Working Directory: {context.worktree_path}

Current File Structure:
{context.file_tree[:3000]}

Analyze the task and implement the required DevOps configurations. Provide specific instructions on what files to create/modify."""
        
        try:
            response = await self._call_llm(prompt, self.SYSTEM_PROMPT)
            
            return ExecutionResult(
                success=True,
                output=response,
                files_changed=[],
                commit_message=f"chore: {context.task_title}"
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e)
            )

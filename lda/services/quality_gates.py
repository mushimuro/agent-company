"""
Quality Gates - Run tests and linting on code changes.
"""
import os
import subprocess
import time
import json
from typing import Tuple, Dict, Any, Optional
from pathlib import Path


class QualityGateRunner:
    """
    Runs quality gates (tests and linting) on code.
    """

    @staticmethod
    def detect_test_framework(repo_path: str) -> str:
        """
        Detect which test framework the project uses.

        Returns:
            Framework name: pytest, jest, vitest, npm_test, or unknown
        """
        # Check for Python test frameworks
        if os.path.exists(os.path.join(repo_path, 'pytest.ini')):
            return 'pytest'

        if os.path.exists(os.path.join(repo_path, 'pyproject.toml')):
            try:
                with open(os.path.join(repo_path, 'pyproject.toml'), 'r') as f:
                    content = f.read()
                    if 'pytest' in content:
                        return 'pytest'
            except:
                pass

        # Check for conftest.py or test files
        for root, dirs, files in os.walk(repo_path):
            # Skip common non-test directories
            dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '.venv', 'venv', '__pycache__'}]
            for file in files:
                if file == 'conftest.py' or file.startswith('test_') and file.endswith('.py'):
                    return 'pytest'

        # Check for JavaScript test frameworks
        package_json = os.path.join(repo_path, 'package.json')
        if os.path.exists(package_json):
            try:
                with open(package_json, 'r') as f:
                    pkg = json.load(f)

                # Check scripts
                scripts = pkg.get('scripts', {})
                if 'test' in scripts:
                    test_script = scripts['test']
                    if 'vitest' in test_script:
                        return 'vitest'
                    elif 'jest' in test_script:
                        return 'jest'
                    else:
                        return 'npm_test'

                # Check dependencies
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                if 'vitest' in deps:
                    return 'vitest'
                elif 'jest' in deps:
                    return 'jest'
            except:
                pass

        return 'unknown'

    @staticmethod
    def detect_linter(repo_path: str) -> Optional[str]:
        """
        Detect which linter the project uses.

        Returns:
            Linter name: eslint, pylint, ruff, or None
        """
        # Check for JavaScript linters
        package_json = os.path.join(repo_path, 'package.json')
        if os.path.exists(package_json):
            try:
                with open(package_json, 'r') as f:
                    pkg = json.load(f)

                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                scripts = pkg.get('scripts', {})

                if 'eslint' in deps or 'lint' in scripts:
                    return 'eslint'
            except:
                pass

        # Check for Python linters
        if os.path.exists(os.path.join(repo_path, '.pylintrc')):
            return 'pylint'

        if os.path.exists(os.path.join(repo_path, 'ruff.toml')) or \
           os.path.exists(os.path.join(repo_path, '.ruff.toml')):
            return 'ruff'

        # Check pyproject.toml for linter config
        pyproject = os.path.join(repo_path, 'pyproject.toml')
        if os.path.exists(pyproject):
            try:
                with open(pyproject, 'r') as f:
                    content = f.read()
                    if '[tool.ruff]' in content:
                        return 'ruff'
                    if '[tool.pylint]' in content:
                        return 'pylint'
            except:
                pass

        return None

    @staticmethod
    def run_tests(repo_path: str, timeout: int = 300) -> Tuple[bool, str, float]:
        """
        Run project tests.

        Args:
            repo_path: Path to project
            timeout: Maximum time in seconds

        Returns:
            (passed: bool, output: str, duration_seconds: float)
        """
        framework = QualityGateRunner.detect_test_framework(repo_path)

        commands = {
            'pytest': ['pytest', '--tb=short', '-v', '--timeout=60'],
            'jest': ['npm', 'test', '--', '--passWithNoTests', '--watchAll=false'],
            'vitest': ['npm', 'run', 'test', '--', '--run'],
            'npm_test': ['npm', 'test', '--', '--passWithNoTests'],
        }

        command = commands.get(framework)
        if not command:
            return True, f"No test framework detected (framework: {framework}). Skipping tests.", 0.0

        try:
            start = time.time()
            result = subprocess.run(
                command,
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=os.name == 'nt'  # Use shell on Windows
            )
            duration = time.time() - start

            passed = result.returncode == 0
            output = result.stdout + "\n" + result.stderr

            return passed, output.strip(), duration

        except subprocess.TimeoutExpired:
            return False, f"Tests timed out after {timeout} seconds", float(timeout)
        except FileNotFoundError as e:
            return True, f"Test command not found: {e}. Skipping tests.", 0.0
        except Exception as e:
            return False, f"Test execution failed: {str(e)}", 0.0

    @staticmethod
    def run_linting(repo_path: str, timeout: int = 120) -> Tuple[bool, str, float]:
        """
        Run code linting.

        Args:
            repo_path: Path to project
            timeout: Maximum time in seconds

        Returns:
            (passed: bool, output: str, duration_seconds: float)
        """
        linter = QualityGateRunner.detect_linter(repo_path)

        if not linter:
            return True, "No linter configured. Skipping lint check.", 0.0

        commands = {
            'eslint': ['npm', 'run', 'lint'],
            'pylint': ['pylint', '--rcfile=.pylintrc', '.', '--exit-zero'],
            'ruff': ['ruff', 'check', '.'],
        }

        command = commands.get(linter)
        if not command:
            return True, f"Unknown linter: {linter}. Skipping.", 0.0

        try:
            start = time.time()
            result = subprocess.run(
                command,
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=os.name == 'nt'
            )
            duration = time.time() - start

            passed = result.returncode == 0
            output = result.stdout + "\n" + result.stderr

            return passed, output.strip(), duration

        except subprocess.TimeoutExpired:
            return False, f"Linting timed out after {timeout} seconds", float(timeout)
        except FileNotFoundError as e:
            return True, f"Lint command not found: {e}. Skipping.", 0.0
        except Exception as e:
            return False, f"Linting failed: {str(e)}", 0.0

    @staticmethod
    async def run_all_gates(repo_path: str) -> Dict[str, Any]:
        """
        Run all quality gates.

        Args:
            repo_path: Path to project

        Returns:
            Dict with test and lint results
        """
        # Run tests
        test_passed, test_output, test_duration = QualityGateRunner.run_tests(repo_path)

        # Run linting
        lint_passed, lint_output, lint_duration = QualityGateRunner.run_linting(repo_path)

        return {
            'tests': {
                'passed': test_passed,
                'output': test_output[:10000],  # Limit output size
                'duration': test_duration,
                'framework': QualityGateRunner.detect_test_framework(repo_path),
            },
            'linting': {
                'passed': lint_passed,
                'output': lint_output[:10000],
                'duration': lint_duration,
                'linter': QualityGateRunner.detect_linter(repo_path),
            },
            'overall_passed': test_passed and lint_passed,
        }

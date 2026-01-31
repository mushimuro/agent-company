"""
LDA Client - Helper functions for making authenticated requests to LDA.
"""
import hashlib
import hmac
import json
import time
from typing import Dict, Any, Optional
from django.conf import settings
import httpx


def generate_lda_signature(timestamp: str, body: str, secret_key: str) -> str:
    """
    Generate HMAC-SHA256 signature for LDA authentication.
    
    Args:
        timestamp: Unix timestamp as string
        body: Request body as JSON string
        secret_key: LDA secret key
    
    Returns:
        Hex-encoded signature
    """
    message = timestamp.encode() + body.encode()
    signature = hmac.new(
        secret_key.encode(),
        message,
        hashlib.sha256
    ).hexdigest()
    return signature


def call_lda(
    endpoint: str,
    data: Dict[str, Any],
    method: str = "POST",
    timeout: float = 30.0
) -> httpx.Response:
    """
    Make an authenticated request to LDA.
    
    Args:
        endpoint: LDA endpoint path (e.g., "/api/v1/pm/decompose")
        data: Request data dictionary
        method: HTTP method (default: POST)
        timeout: Request timeout in seconds
    
    Returns:
        httpx.Response object
    
    Raises:
        httpx.RequestError: If request fails
        httpx.HTTPStatusError: If response status is error
    """
    lda_url = getattr(settings, 'LDA_URL', 'http://localhost:8001')
    lda_secret = getattr(settings, 'LDA_SECRET_KEY', '')
    
    timestamp = str(int(time.time()))
    request_body = json.dumps(data)
    signature = generate_lda_signature(timestamp, request_body, lda_secret)
    
    headers = {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-Signature": signature
    }
    
    url = f"{lda_url}{endpoint}"
    
    if method.upper() == "POST":
        response = httpx.post(url, content=request_body, headers=headers, timeout=timeout)
    elif method.upper() == "GET":
        response = httpx.get(url, headers=headers, timeout=timeout)
    else:
        raise ValueError(f"Unsupported HTTP method: {method}")
    
    return response


def call_lda_safe(
    endpoint: str,
    data: Dict[str, Any],
    method: str = "POST",
    timeout: float = 30.0
) -> Optional[Dict[str, Any]]:
    """
    Make an authenticated request to LDA with error handling.
    Returns None if request fails.
    
    Args:
        endpoint: LDA endpoint path
        data: Request data dictionary
        method: HTTP method
        timeout: Request timeout in seconds
    
    Returns:
        Response JSON as dict, or None if request fails
    """
    try:
        response = call_lda(endpoint, data, method, timeout)
        response.raise_for_status()
        return response.json()
    except (httpx.RequestError, httpx.HTTPStatusError):
        return None

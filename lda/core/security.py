import hmac
import hashlib
import time
from fastapi import Request, HTTPException, Security
from fastapi.security import APIKeyHeader
from .config import settings

X_SIGNATURE = APIKeyHeader(name="X-Signature", auto_error=False)
X_TIMESTAMP = APIKeyHeader(name="X-Timestamp", auto_error=False)

def verify_signature(request_data: bytes, signature: str, timestamp: str):
    """
    Verify the HMAC signature of the request.
    The signature is hex(hmac_sha256(key, timestamp + body))
    """
    if not signature or not timestamp:
        return False
    
    # Check if timestamp is too old (5 minutes window)
    try:
        ts = int(timestamp)
        if abs(time.time() - ts) > 300:
            return False
    except ValueError:
        return False
    
    # Create expected signature
    message = timestamp.encode() + request_data
    expected_signature = hmac.new(
        settings.LDA_SECRET_KEY.encode(),
        message,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)

async def signature_required(request: Request):
    """
    Dependency to require a valid signature on the request.
    """
    signature = request.headers.get("X-Signature")
    timestamp = request.headers.get("X-Timestamp")
    body = await request.body()
    
    if not verify_signature(body, signature, timestamp):
        raise HTTPException(status_code=401, detail="Invalid or missing signature")
    
    return True

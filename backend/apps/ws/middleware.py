import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware

User = get_user_model()

@database_sync_to_async
def get_user(validated_token):
    try:
        user = User.objects.get(id=validated_token["user_id"])
        return user
    except User.DoesNotExist:
        return AnonymousUser()

class WebSocketJWTAuthMiddleware(BaseMiddleware):
    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        # Close old connections to avoid old auth
        # try: 
        #    query_string = scope.get("query_string", b"").decode("utf-8")
        # except:
        #    query_string = ""
           
        # We'll expect the token in the query string: ?token=<token>
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = dict(qs.split("=") for qs in query_string.split("&") if "=" in qs)
        token = query_params.get("token", None)
        
        if token is None:
             # Try to get from headers if not in query params (optional, standard ws client uses query)
            headers = dict(scope['headers'])
            if b'authorization' in headers:
                try:
                    token_name, token_key = headers[b'authorization'].decode().split()
                    if token_name == 'Bearer':
                        token = token_key
                except ValueError:
                    token = None

        if token:
            try:
                # Untrusted decoding to get the algorithm
                # jwt.decode(token, options={"verify_signature": False})
                
                # Verify the token
                decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                scope["user"] = await get_user(decoded_data)
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

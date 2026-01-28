import jwt
from urllib.parse import parse_qs
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
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]
        
        print(f"WebSocket Middleware: Connection attempt. Token present: {bool(token)}")

        if token is None:
             # Try to get from headers if not in query params
            headers = dict(scope['headers'])
            if b'authorization' in headers:
                try:
                    token_name, token_key = headers[b'authorization'].decode().split()
                    if token_name == 'Bearer':
                        token = token_key
                        print("WebSocket Middleware: Found token in headers")
                except ValueError:
                    token = None

        if token:
            try:
                # Verify the token
                decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user = await get_user(decoded_data)
                scope["user"] = user
                print(f"WebSocket Middleware: Authenticated user: {user}")
            except jwt.ExpiredSignatureError:
                print("WebSocket Middleware: Token expired")
                scope["user"] = AnonymousUser()
            except jwt.InvalidTokenError as e:
                print(f"WebSocket Middleware: Invalid token: {e}")
                scope["user"] = AnonymousUser()
            except Exception as e:
                print(f"WebSocket Middleware: Error decoding token: {e}")
                scope["user"] = AnonymousUser()
        else:
            print("WebSocket Middleware: No token found")
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

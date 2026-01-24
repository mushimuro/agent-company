from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WritableRoot, AuditLog
from .serializers import WritableRootSerializer, AuditLogSerializer

class WritableRootViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WritableRootSerializer
    queryset = WritableRoot.objects.all()

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly viewset for audit logs.
    Audits are ingested via a special endpoint or created by backend logic.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AuditLogSerializer
    
    def get_queryset(self):
        # Users can only see logs for their own actions/tasks
        # For simplicity now, return all if staff, or filter by user
        if self.request.user.is_staff:
            return AuditLog.objects.all()
        return AuditLog.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def ingest(self, request):
        """
        Special endpoint for LDA to ingest audit logs.
        Needs signature verification (conceptually, for now we skip strict check).
        """
        # TODO: Strict HMAC verification for LDA ingestion
        serializer = AuditLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

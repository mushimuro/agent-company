from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
import httpx
import hashlib
import time
import os
from .models import WritableRoot, AuditLog, PMDecomposition
from .serializers import (
    WritableRootSerializer, AuditLogSerializer,
    PMDecompositionSerializer
)


class WritableRootViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing writable roots (approved folders).
    Users can only manage their own writable roots.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WritableRootSerializer

    def get_queryset(self):
        return WritableRoot.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['post'], url_path='validate-path')
    def validate_path(self, request):
        """
        Validate if a path can be added as a writable root.
        Checks with LDA if the path is safe and accessible.
        """
        path = request.data.get('path', '')

        if not path:
            return Response(
                {'error': 'Path is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Basic validation
        if not os.path.isabs(path):
            return Response({
                'valid': False,
                'error': 'Path must be absolute'
            })

        # Check if path is a system folder
        system_folders = [
            "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)",
            "/System", "/usr", "/etc", "/bin", "/sbin"
        ]
        canonical = os.path.normpath(path)
        for blocked in system_folders:
            if canonical.lower().startswith(blocked.lower()):
                return Response({
                    'valid': False,
                    'error': f'Cannot add system folder: {blocked}'
                })

        # Check if path already exists in user's writable roots
        exists = WritableRoot.objects.filter(
            owner=self.request.user,
            path=canonical
        ).exists()
        if exists:
            return Response({
                'valid': False,
                'error': 'Path already added as writable root'
            })

        # Try to check with LDA if path exists and is accessible
        try:
            lda_url = getattr(settings, 'LDA_URL', 'http://localhost:8001')
            lda_secret = getattr(settings, 'LDA_SECRET_KEY', '')

            timestamp = str(int(time.time()))
            signature = hashlib.sha256(f"{timestamp}{lda_secret}".encode()).hexdigest()

            response = httpx.post(
                f"{lda_url}/api/files/list",
                json={"path": path},
                headers={
                    "X-Timestamp": timestamp,
                    "X-Signature": signature
                },
                timeout=10.0
            )

            if response.status_code == 200:
                return Response({
                    'valid': True,
                    'canonical_path': canonical,
                    'message': 'Path is valid and accessible'
                })
            else:
                return Response({
                    'valid': False,
                    'error': 'Path is not accessible or does not exist'
                })

        except httpx.RequestError:
            # If LDA is not available, just do local validation
            if os.path.exists(path) and os.path.isdir(path):
                return Response({
                    'valid': True,
                    'canonical_path': canonical,
                    'message': 'Path exists (LDA not available for full validation)'
                })
            return Response({
                'valid': False,
                'error': 'Path does not exist or is not a directory'
            })


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly viewset for audit logs.
    Audits are ingested via LDA or created by backend logic.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        queryset = AuditLog.objects.all()

        # Staff can see all, regular users only their own
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)

        # Filter by action type
        action_filter = self.request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Filter by result
        result_filter = self.request.query_params.get('result')
        if result_filter:
            queryset = queryset.filter(result=result_filter)

        # Filter by task
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def ingest(self, request):
        """
        Endpoint for LDA to ingest audit logs.
        Verifies signature from LDA.
        """
        # Verify signature
        lda_secret = getattr(settings, 'LDA_SECRET_KEY', '')
        timestamp = request.headers.get('X-Timestamp', '')
        provided_signature = request.headers.get('X-Signature', '')

        if lda_secret:
            expected_signature = hashlib.sha256(
                f"{timestamp}{lda_secret}".encode()
            ).hexdigest()

            if provided_signature != expected_signature:
                return Response(
                    {'error': 'Invalid signature'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check timestamp freshness (within 5 minutes)
            try:
                ts = int(timestamp)
                if abs(time.time() - ts) > 300:
                    return Response(
                        {'error': 'Timestamp expired'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid timestamp'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = AuditLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get audit log statistics."""
        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'allowed': queryset.filter(result='ALLOWED').count(),
            'denied': queryset.filter(result='DENIED').count(),
            'by_action': {}
        }

        for action_choice in AuditLog.OPERATION_CHOICES:
            action_code = action_choice[0]
            stats['by_action'][action_code] = queryset.filter(action=action_code).count()

        return Response(stats)


class PMDecompositionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly viewset for PM decompositions.
    Decompositions are created via project initialize-with-pm endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PMDecompositionSerializer

    def get_queryset(self):
        return PMDecomposition.objects.filter(
            project__owner=self.request.user
        ).select_related('project')

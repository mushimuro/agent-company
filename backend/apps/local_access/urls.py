from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WritableRootViewSet, AuditLogViewSet, PMDecompositionViewSet

router = DefaultRouter()
router.register(r'writable-roots', WritableRootViewSet, basename='writable-root')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'pm-decompositions', PMDecompositionViewSet, basename='pm-decomposition')

urlpatterns = [
    path('', include(router.urls)),
]

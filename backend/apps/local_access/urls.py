from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WritableRootViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'writable-roots', WritableRootViewSet, basename='writable-root')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    SaleViewSet,
    StockMovementViewSet,
    ReportsStatsView,
    UserRegisterView,
    LoginView,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'kardex', StockMovementViewSet, basename='kardex')

urlpatterns = [
    path('', include(router.urls)),
    path('reports/stats/', ReportsStatsView.as_view(), name='reports_stats'),
    path('register/', UserRegisterView.as_view(), name='user_register'),
    path('login/', LoginView.as_view(), name='login'),
]

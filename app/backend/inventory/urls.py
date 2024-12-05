from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, SaleViewSet, UserRegisterView, ProductListView, LoginView

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='user_register'),  # Ruta para registro
    path('products/', ProductListView.as_view(), name='product-list'),
    path('login/', LoginView.as_view(), name='login'),
] + router.urls
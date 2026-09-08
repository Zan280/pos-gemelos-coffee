from django.db import transaction
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Product, Sale, SaleItem
from .serializers import (
    ProductSerializer,
    SaleSerializer,
    SaleItemSerializer,
    UserSerializer,
)

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet para listar, consultar, crear, modificar y eliminar productos.
    """
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet para consultar y registrar ventas.
    Implementa transacciones atómicas y bloqueo pesimista de stock con select_for_update().
    """
    queryset = Sale.objects.all().prefetch_related('items__product').order_by('-created_at')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.get("items", [])
        client_total = data.get("total")

        if not items_data or not isinstance(items_data, list):
            return Response(
                {"error": "Datos inválidos: la venta debe incluir al menos un producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 1. Crear el objeto Sale inicial
            sale = Sale.objects.create(total_price=0)
            calculated_total = 0

            # 2. Procesar cada producto con bloqueo de fila (select_for_update)
            for item in items_data:
                product_id = item.get("id")
                try:
                    quantity = int(item.get("quantity", 0))
                except (ValueError, TypeError):
                    return Response(
                        {"error": f"Cantidad inválida para el producto con ID {product_id}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if quantity <= 0:
                    return Response(
                        {"error": f"La cantidad solicitada para el producto con ID {product_id} debe ser mayor a 0."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Bloqueo pesimista de fila para evitar condiciones de carrera (race conditions)
                try:
                    product = Product.objects.select_for_update().get(id=product_id)
                except Product.DoesNotExist:
                    return Response(
                        {"error": f"El producto con ID {product_id} no fue encontrado."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Validar existencia de stock
                if product.stock < quantity:
                    return Response(
                        {
                            "error": f"Stock insuficiente para '{product.name}'. Disponible: {product.stock}, Solicitado: {quantity}."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Descontar existencias y persistir producto
                product.stock -= quantity
                product.save(update_fields=['stock'])

                # Calcular subtotal del ítem
                item_subtotal = product.price * quantity
                calculated_total += item_subtotal

                # Crear SaleItem
                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    quantity=quantity,
                    price=item_subtotal,
                )

            # Actualizar el precio total de la venta
            sale.total_price = calculated_total
            sale.save(update_fields=['total_price'])

            serializer = self.get_serializer(sale)
            return Response(
                {
                    "message": "Venta procesada exitosamente.",
                    "sale_id": sale.id,
                    "sale": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

class UserRegisterView(generics.CreateAPIView):
    """
    Endpoint para registro de nuevos usuarios.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class LoginView(APIView):
    """
    Endpoint de login con JWT.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"detail": "Debe proporcionar usuario y contraseña."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


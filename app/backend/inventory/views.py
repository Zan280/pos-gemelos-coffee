from django.shortcuts import render
from rest_framework import viewsets
from .models import Product, Sale, SaleItem
from .serializers import ProductSerializer, SaleSerializer, SaleItemSerializer
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework import generics
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from rest_framework.views import APIView

# Vista para ventas
class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        print("Datos recibidos en el backend:", data)  # Imprime los datos recibidos del frontend
        items = data.get("items", [])
        total = data.get("total", 0)

        if not items or total <= 0:
            return Response(
                {"error": "Invalid data: items or total missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                # Creamos la venta
                sale = Sale.objects.create(total_price=total)

                calculated_total = 0

                for item in items:
                    product = Product.objects.get(id=item["id"])

                    print(f"Producto: {product.name}, Stock actual: {product.stock}, Cantidad a restar: {item['quantity']}") #imprimir la cnatiddad a restar

                    # Verificamos si hay suficiente stock
                    if product.stock < item["quantity"]:
                        return Response(
                            {"error": f"Not enough stock for product {product.name}."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Creamos el SaleItem para asociar a la venta
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        quantity=item["quantity"],
                        price=product.price,
                    )

                    # Restamos la cantidad vendida del stock
                    print(f"Antes de restar: {product.name} - Stock {product.stock}")  # Verifica el nuevo stock
                    product.stock -= item["quantity"]
                    print(f"Despues de restar: {product.name} - Nuevo stock {product.stock}")  # Verifica el nuevo stock
                    product.save()

                    # Calculamos el total de la venta
                    calculated_total += product.price * item["quantity"]

                # Verificamos si el total calculado coincide con el total recibido
                if calculated_total != total:
                    return Response(
                        {"error": "Total mismatch. Please verify data."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Si todo es correcto, confirmamos la venta
                return Response({"message": "Sale confirmed", "sale_id": sale.id}, status=status.HTTP_201_CREATED)

            except Product.DoesNotExist:
                return Response(
                    {"error": "One or more products not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except Exception as e:
                return Response(
                    {"error": "An unexpected error occurred.", "details": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

# Vista para productos
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

# Serializador para el registro de usuario
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'email']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_password(validated_data['password'])  # Encripta la contraseña
        user.save()
        return user

# Vista para el registro de usuario
class UserRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

# Endpoint para listar productos
class ProductListView(APIView):
    permission_classes = [IsAuthenticated]  # Solo usuarios autenticados pueden acceder
    authentication_classes = [JWTAuthentication]  # Usar JWTAuthentication

    def get(self, request):
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)  # Serializa los productos
        return Response(serializer.data)  # Retorna los datos serializados



# Vista de login con JWT
class LoginView(APIView):
    permission_classes = [AllowAny]  # Permitir acceso sin autenticación previa

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        # Autenticar usuario
        user = authenticate(username=username, password=password)

        if user is not None:
            # Generar tokens JWT
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

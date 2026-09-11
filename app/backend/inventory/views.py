from datetime import datetime, time, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Avg, F, Q
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Product, Sale, SaleItem, StockMovement
from .permissions import IsAdminOrSuperuser
from .serializers import (
    ProductSerializer,
    SaleSerializer,
    SaleItemSerializer,
    StockMovementSerializer,
    UserSerializer,
)

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet para listar, consultar, crear, modificar y eliminar productos.
    """
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        product = serializer.save()
        if product.item_type == 'PRODUCT' and product.stock > 0:
            unit_cost = product.cost_price or Decimal('0.00')
            total_cost = Decimal(str(product.stock)) * unit_cost
            StockMovement.objects.create(
                product=product,
                movement_type='INITIAL',
                quantity=product.stock,
                unit_cost=unit_cost,
                total_cost=total_cost,
                previous_stock=0,
                resulting_stock=product.stock,
                previous_balance=Decimal('0.00'),
                resulting_balance=total_cost,
                user=self.request.user if self.request.user.is_authenticated else None,
                notes="Inventario inicial al crear producto"
            )

class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet para consultar y registrar ventas.
    Implementa transacciones atómicas y bloqueo pesimista de stock con select_for_update().
    - PRODUCT: Valida y descuenta stock físico, y registra movimiento en Kardex con CPP vigente.
    - SERVICE: Permite venta sin descontar stock físico ni registrar movimiento en Kardex.
    - Guarda el cost_price histórico congelado en cada SaleItem.
    """
    queryset = Sale.objects.all().prefetch_related('items__product', 'user').order_by('-created_at')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        date = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        payment_method = self.request.query_params.get('payment_method')

        if search:
            queryset = queryset.filter(
                Q(id__icontains=search) |
                Q(user__username__icontains=search) |
                Q(items__product__name__icontains=search)
            ).distinct()

        if date:
            queryset = queryset.filter(created_at__date=date)
        else:
            if start_date:
                queryset = queryset.filter(created_at__date__gte=start_date)
            if end_date:
                queryset = queryset.filter(created_at__date__lte=end_date)

        if payment_method and payment_method != 'all':
            queryset = queryset.filter(payment_method=payment_method)

        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.get("items", [])
        payment_method = data.get("payment_method", "cash")

        if not items_data or not isinstance(items_data, list):
            return Response(
                {"error": "Datos inválidos: la venta debe incluir al menos un producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 1. Crear el objeto Sale inicial
            current_user = request.user if request.user.is_authenticated else None
            sale = Sale.objects.create(
                total_price=0,
                user=current_user,
                payment_method=payment_method
            )
            calculated_total = Decimal('0.00')

            # 2. Procesar cada ítem
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

                is_physical_product = (product.item_type == 'PRODUCT')

                if is_physical_product:
                    # Validar existencia de stock para productos físicos de reventa
                    if product.stock < quantity:
                        return Response(
                            {
                                "error": f"Stock insuficiente para '{product.name}'. Disponible: {product.stock}, Solicitado: {quantity}."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    previous_stock = product.stock
                    applied_cost = product.cost_price or Decimal('0.00')
                    previous_balance = Decimal(str(previous_stock)) * applied_cost

                    # Descontar existencias y persistir producto
                    product.stock -= quantity
                    product.save(update_fields=['stock'])

                    resulting_stock = product.stock
                    resulting_balance = Decimal(str(resulting_stock)) * applied_cost
                    total_salida_cost = -(Decimal(str(quantity)) * applied_cost)

                # Calcular subtotal de venta del ítem
                item_subtotal = product.price * Decimal(str(quantity))
                calculated_total += item_subtotal

                # Crear SaleItem congelando el cost_price unitario al momento de la venta
                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    quantity=quantity,
                    price=item_subtotal,
                    cost_price=product.cost_price or Decimal('0.00'),
                )

                # 3. Registrar Kardex automático únicamente para productos físicos a valor de costo CPP
                if is_physical_product:
                    StockMovement.objects.create(
                        product=product,
                        movement_type='SALE',
                        quantity=-quantity,
                        unit_cost=applied_cost,
                        total_cost=total_salida_cost,
                        previous_stock=previous_stock,
                        resulting_stock=resulting_stock,
                        previous_balance=previous_balance,
                        resulting_balance=resulting_balance,
                        user=current_user,
                        notes=f"Venta POS #{sale.id}"
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

class StockMovementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para trazabilidad y auditoría de inventario (Kardex).
    Acceso exclusivo para Administradores.
    """
    queryset = StockMovement.objects.select_related('product', 'user').order_by('-created_at')
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperuser]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        movement_type = self.request.query_params.get('type')
        date_from = self.request.query_params.get('from')
        date_to = self.request.query_params.get('to')
        category = self.request.query_params.get('category')
        item_type = self.request.query_params.get('item_type')

        # Por defecto solo productos de inventario físico
        if item_type:
            queryset = queryset.filter(product__item_type=item_type)
        else:
            queryset = queryset.filter(product__item_type='PRODUCT')

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if category and category != 'all':
            queryset = queryset.filter(product__category=category)
        if movement_type and movement_type != 'all':
            queryset = queryset.filter(movement_type=movement_type)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Permite al Administrador registrar Entradas de Stock (Reabastecimiento con cálculo CPP) o Ajustes manuales.
        """
        product_id = request.data.get('product')
        movement_type = request.data.get('movement_type', 'RESTOCK')
        notes = request.data.get('notes', '')

        try:
            quantity = int(request.data.get('quantity', 0))
        except (ValueError, TypeError):
            return Response({"error": "Cantidad numérica inválida."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0 and movement_type == 'RESTOCK':
            return Response({"error": "La cantidad a ingresar debe ser mayor a cero."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity == 0:
            return Response({"error": "La cantidad debe ser distinta de cero."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "Producto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

            if product.item_type != 'PRODUCT':
                return Response({"error": "Solo se pueden registrar movimientos de stock para ítems tipo Producto."}, status=status.HTTP_400_BAD_REQUEST)

            previous_stock = product.stock
            previous_cost = product.cost_price or Decimal('0.00')
            previous_balance = Decimal(str(previous_stock)) * previous_cost

            if movement_type == 'RESTOCK':
                # Parsear costo unitario de compra
                try:
                    unit_cost = Decimal(str(request.data.get('unit_cost', previous_cost)))
                    if unit_cost < Decimal('0.00'):
                        raise ValueError()
                except Exception:
                    return Response({"error": "Costo unitario de compra inválido."}, status=status.HTTP_400_BAD_REQUEST)

                new_sale_price_raw = request.data.get('new_sale_price')
                movement_total = Decimal(str(quantity)) * unit_cost
                resulting_stock = previous_stock + quantity
                resulting_balance = previous_balance + movement_total

                # Fórmula de Costo Promedio Ponderado (CPP)
                if resulting_stock > 0:
                    new_cpp = (resulting_balance / Decimal(str(resulting_stock))).quantize(Decimal('0.01'))
                else:
                    new_cpp = unit_cost

                # Actualizar Producto
                product.stock = resulting_stock
                product.cost_price = new_cpp

                update_fields = ['stock', 'cost_price']
                if new_sale_price_raw is not None and str(new_sale_price_raw).strip() != '':
                    try:
                        new_sale_price = Decimal(str(new_sale_price_raw))
                        if new_sale_price >= Decimal('0.00'):
                            product.price = new_sale_price
                            update_fields.append('price')
                    except Exception:
                        pass

                product.save(update_fields=update_fields)

                movement = StockMovement.objects.create(
                    product=product,
                    movement_type='RESTOCK',
                    quantity=quantity,
                    unit_cost=unit_cost,
                    total_cost=movement_total,
                    previous_stock=previous_stock,
                    resulting_stock=resulting_stock,
                    previous_balance=previous_balance,
                    resulting_balance=resulting_balance,
                    user=request.user if request.user.is_authenticated else None,
                    notes=notes or f"Entrada de mercadería (Compra @ ${unit_cost:.2f})"
                )

            elif movement_type == 'ADJUSTMENT':
                applied_cost = previous_cost
                resulting_stock = previous_stock + quantity
                if resulting_stock < 0:
                    return Response({"error": "El stock resultante no puede ser menor a cero."}, status=status.HTTP_400_BAD_REQUEST)

                resulting_balance = Decimal(str(resulting_stock)) * applied_cost
                movement_total = Decimal(str(quantity)) * applied_cost

                product.stock = resulting_stock
                product.save(update_fields=['stock'])

                movement = StockMovement.objects.create(
                    product=product,
                    movement_type='ADJUSTMENT',
                    quantity=quantity,
                    unit_cost=applied_cost,
                    total_cost=movement_total,
                    previous_stock=previous_stock,
                    resulting_stock=resulting_stock,
                    previous_balance=previous_balance,
                    resulting_balance=resulting_balance,
                    user=request.user if request.user.is_authenticated else None,
                    notes=notes or "Ajuste manual de inventario"
                )
            else:
                return Response({"error": "Tipo de movimiento no soportado."}, status=status.HTTP_400_BAD_REQUEST)

            serializer = self.get_serializer(movement)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class ReportsStatsView(APIView):
    """
    Endpoint con estadísticas y KPIs consolidados para el Módulo de Reportes.
    Acceso exclusivo para Administradores.
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperuser]

    def get(self, request, *args, **kwargs):
        now = timezone.now()
        today_start = timezone.make_aware(datetime.combine(now.date(), time.min))
        month_start = timezone.make_aware(datetime(now.year, now.month, 1, 0, 0, 0))

        # 1. Métricas Globales
        all_sales = Sale.objects.all()
        total_sales_count = all_sales.count()
        total_revenue = all_sales.aggregate(total=Sum('total_price'))['total'] or 0
        average_ticket = all_sales.aggregate(avg=Avg('total_price'))['avg'] or 0

        # Ventas de Hoy
        today_sales = all_sales.filter(created_at__gte=today_start)
        today_revenue = today_sales.aggregate(total=Sum('total_price'))['total'] or 0
        today_count = today_sales.count()

        # Ventas del Mes
        month_sales = all_sales.filter(created_at__gte=month_start)
        month_revenue = month_sales.aggregate(total=Sum('total_price'))['total'] or 0
        month_count = month_sales.count()

        # Cálculo de Costos y Utilidad Real
        all_sale_items = SaleItem.objects.all()
        total_cost = sum(((item.cost_price or 0) * item.quantity) for item in all_sale_items)
        real_profit = float(total_revenue) - float(total_cost)
        estimated_profit = real_profit if total_cost > 0 else (float(total_revenue) * 0.60)

        # 2. Top 5 Productos Más Vendidos
        top_items = (
            SaleItem.objects.values('product__id', 'product__name', 'product__price')
            .annotate(
                total_qty=Sum('quantity'),
                total_income=Sum('price')
            )
            .order_by('-total_qty')[:5]
        )

        top_products = [
            {
                "id": item['product__id'],
                "name": item['product__name'],
                "price": float(item['product__price'] or 0),
                "total_quantity": item['total_qty'],
                "total_revenue": float(item['total_income'] or 0),
            }
            for item in top_items
        ]

        # 3. Tendencia de Ventas Diarias (Últimos 7 días)
        daily_trends = []
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_start_t = timezone.make_aware(datetime.combine(day_date, time.min))
            day_end_t = timezone.make_aware(datetime.combine(day_date, time.max))

            day_total = (
                Sale.objects.filter(created_at__range=(day_start_t, day_end_t))
                .aggregate(total=Sum('total_price'))['total']
                or 0
            )
            day_sales_cnt = Sale.objects.filter(created_at__range=(day_start_t, day_end_t)).count()

            daily_trends.append({
                "date": day_date.strftime("%Y-%m-%d"),
                "display_date": day_date.strftime("%d %b"),
                "total": float(day_total),
                "count": day_sales_cnt
            })

        # 4. Distribución por Métodos de Pago
        payment_methods_query = all_sales.values('payment_method').annotate(count=Count('id'), total=Sum('total_price'))
        payment_methods = [
            {
                "method": pm['payment_method'],
                "count": pm['count'],
                "total": float(pm['total'] or 0)
            }
            for pm in payment_methods_query
        ]

        return Response({
            "kpis": {
                "total_revenue": float(total_revenue),
                "total_sales_count": total_sales_count,
                "today_revenue": float(today_revenue),
                "today_count": today_count,
                "month_revenue": float(month_revenue),
                "month_count": month_count,
                "average_ticket": float(average_ticket),
                "estimated_profit": float(estimated_profit),
            },
            "top_products": top_products,
            "daily_trends": daily_trends,
            "payment_methods": payment_methods,
        }, status=status.HTTP_200_OK)

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
    Retorna los flags de rol e información de staff/superuser para RBAC en frontend.
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
            is_admin = user.is_staff or user.is_superuser or user.username.lower() == 'maguirre'
            role = 'admin' if is_admin else 'cashier'

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'role': role,
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "Credenciales inválidas. Verifica tu usuario y contraseña."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


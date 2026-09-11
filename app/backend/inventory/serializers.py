from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Product, Sale, SaleItem, StockMovement

class ProductSerializer(serializers.ModelSerializer):
    profit_margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 
            'name', 
            'category', 
            'item_type', 
            'item_type_display', 
            'cost_price', 
            'price', 
            'profit_margin', 
            'stock', 
            'image'
        ]

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    profit = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'product_unit_price', 'cost_price', 'total_cost', 'profit', 'quantity', 'price']
        read_only_fields = ['price', 'cost_price']

# Alias para compatibilidad
SaleItemSerealizer = SaleItemSerializer

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_username = serializers.CharField(source='user.username', read_only=True, default="Cajero")

    class Meta:
        model = Sale
        fields = ['id', 'created_at', 'total_price', 'payment_method', 'user', 'cashier_username', 'items']
        read_only_fields = ['created_at', 'total_price']

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    category = serializers.CharField(source='product.category', read_only=True)
    item_type = serializers.CharField(source='product.item_type', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True, default="Sistema")
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id',
            'product',
            'product_name',
            'category',
            'product_price',
            'item_type',
            'movement_type',
            'movement_type_display',
            'quantity',
            'unit_cost',
            'total_cost',
            'previous_stock',
            'resulting_stock',
            'previous_balance',
            'resulting_balance',
            'user',
            'username',
            'notes',
            'created_at',
        ]
        read_only_fields = ['created_at', 'previous_stock', 'resulting_stock', 'previous_balance', 'resulting_balance', 'unit_cost', 'total_cost']

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'is_staff', 'is_superuser', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def get_role(self, obj):
        if obj.is_staff or obj.is_superuser or obj.username.lower() == 'maguirre':
            return 'admin'
        return 'cashier'

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user




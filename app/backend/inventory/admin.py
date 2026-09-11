from django.contrib import admin
from django.contrib import messages
from .models import Product, Sale, SaleItem, StockMovement

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'cost_price', 'price', 'profit_margin', 'stock')
    list_filter = ('item_type',)
    search_fields = ('name',)

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    readonly_fields = ('price', 'cost_price')
    fields = ('product', 'quantity', 'cost_price', 'price')

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    inlines = [SaleItemInline]
    readonly_fields = ('total_price', 'created_at')
    list_display = ('id', 'created_at', 'payment_method', 'user', 'total_price')
    list_filter = ('payment_method', 'created_at')

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'product', 'movement_type', 'quantity', 'previous_stock', 'resulting_stock', 'user')
    list_filter = ('movement_type', 'created_at')
    search_fields = ('product__name', 'notes')


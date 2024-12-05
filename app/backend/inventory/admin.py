from django.contrib import admin
from django.contrib import messages
from .models import Product, Sale, SaleItem

# Registra el modelo de productos
admin.site.register(Product)

# Configuración de SaleItem como Inline
class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1  # Número de filas en blanco para agregar nuevos ítems
    readonly_fields = ('price',)  # Muestra el precio como campo de solo lectura
    fields = ('product', 'quantity', 'price')  # Campos que se incluyen en la interfaz

# Configuración del modelo de ventas
class SaleAdmin(admin.ModelAdmin):
    inlines = [SaleItemInline]  # Relaciona Sale con SaleItem
    readonly_fields = ('total_price',)  # Muestra el precio total como solo lectura
    list_display = ('id', 'created_at', 'total_price')  # Muestra el total en el listado de ventas

    def save_model(self, request, obj, form, change):
        """
        Lógica adicional para guardar una venta. No necesitamos 
        verificar productos aquí porque SaleItem maneja el stock.
        """
        super().save_model(request, obj, form, change)

    def response_add(self, request, obj, post_url_continue=None):
        """
        Mensaje de confirmación después de agregar una venta.
        """
        messages.success(request, "La venta se ha completado con éxito.")
        return super().response_add(request, obj, post_url_continue)

# Registra el modelo de ventas con su configuración
admin.site.register(Sale, SaleAdmin)


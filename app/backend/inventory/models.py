from django.db import models
from django.contrib.auth.models import User

class Product(models.Model):
    ITEM_TYPE_CHOICES = [
        ('PRODUCT', 'Producto de Reventa'),
        ('SERVICE', 'Servicio / Preparado'),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, blank=True, default="General", help_text="Departamento o Categoría")
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, default='PRODUCT')
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Costo Promedio Ponderado (CPP) o costo de adquisición")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Precio de venta al público")
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        type_str = "Servicio" if self.item_type == 'SERVICE' else f"Stock: {self.stock}"
        return f"{self.name} ({type_str})"

    @property
    def profit_margin(self):
        """
        Calcula el margen de ganancia unitario bruto (Precio de venta - Costo de adquisición/CPP)
        """
        return (self.price or 0) - (self.cost_price or 0)

class Sale(models.Model):
    PAYMENT_CHOICES = [
        ('cash', 'Efectivo'),
        ('card', 'Tarjeta'),
        ('transfer', 'Transferencia'),
    ]

    created_at = models.DateTimeField(auto_now_add=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cash')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Sale #{self.id} - {self.created_at.strftime("%Y-%m-%d %H:%M:%S")}'

    def update_total_price(self, commit=True):
        """
        Calcula el precio total sumando los subtotales de los SaleItems asociados
        """
        total = sum((item.price or 0) for item in self.items.all())
        self.total_price = total
        if commit and self.pk:
            self.save(update_fields=['total_price'])
        return total

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Costo unitario congelado al momento de la venta (CPP)")
    price = models.DecimalField(max_digits=10, decimal_places=2, editable=False, help_text="Subtotal de venta (unitario * cantidad)")

    def save(self, *args, **kwargs):
        """
        Calcula el subtotal (precio unitario * cantidad) y congela el costo unitario antes de persistir
        """
        if self.product:
            if self.cost_price is None or (self.cost_price == 0 and self.product.cost_price > 0):
                self.cost_price = self.product.cost_price or 0.00
            if self.price is None or self.price == 0:
                self.price = self.product.price * self.quantity
        super().save(*args, **kwargs)

    @property
    def total_cost(self):
        """Costo total de la línea de venta (cost_price * quantity)"""
        return (self.cost_price or 0) * self.quantity

    @property
    def profit(self):
        """Utilidad bruta de la línea de venta (price - total_cost)"""
        return (self.price or 0) - self.total_cost

    def __str__(self):
        return f'{self.quantity} x {self.product.name} (Venta #{self.sale.id})'

class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('SALE', 'Salida por Venta POS'),
        ('RESTOCK', 'Entrada por Reabastecimiento / Compra'),
        ('ADJUSTMENT', 'Ajuste Manual'),
        ('INITIAL', 'Inventario Inicial'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_movements")
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES, default='SALE')
    quantity = models.IntegerField(help_text="Cantidad agregada (+) o deducida (-)")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Costo unitario aplicado (CPP o costo de adquisición)")
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Monto monetario del movimiento (quantity * unit_cost)")
    previous_stock = models.PositiveIntegerField(default=0)
    resulting_stock = models.PositiveIntegerField(default=0)
    previous_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Saldo monetario total previo del producto")
    resulting_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Saldo monetario total resultante del producto")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="stock_movements")
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_movement_type_display()} - {self.product.name} ({self.quantity})'




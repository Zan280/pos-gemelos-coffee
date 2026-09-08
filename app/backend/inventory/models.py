from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (Stock: {self.stock})"

class Sale(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

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
    price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        """
        Calcula el subtotal (precio unitario * cantidad) antes de persistir
        """
        if self.product and (self.price is None or self.price == 0):
            self.price = self.product.price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.quantity} x {self.product.name} (Venta #{self.sale.id})'



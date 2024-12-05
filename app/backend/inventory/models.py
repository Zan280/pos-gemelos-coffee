from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)

    def __str__(self):
        return self.name

class Sale(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f'Sale {self.id} - {self.created_at.strftime("%Y-%m-%d %H:%M:%S")}'

    def update_total_price(self):
        """
        Calcula el precio total sumando los precios de los SaleItems
        """
        total = sum(item.price for item in self.items.all())  # 'items' es el related_name en SaleItem
        self.total_price = total
        self.save()  # Guarda el objeto Sale con el total actualizado

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)  # No editable

    def save(self, *args, **kwargs):
        """
        Calcula el precio total para este producto y reduce el stock
        """
        # Asigna el precio basado en el producto y cantidad
        self.price = self.product.price * self.quantity

        # Lógica de reducción de stock se elimina de aquí
        # Guarda el SaleItem
        super().save(*args, **kwargs)

        # Actualiza el total de la venta
        self.sale.update_total_price()

    def __str__(self):
        return f'{self.quantity} x {self.product.name} (Sale {self.sale.id})'


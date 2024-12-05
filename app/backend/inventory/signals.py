from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import SaleItem

@receiver(pre_save, sender=SaleItem)
def adjust_price(sender, instance, **kwargs):
    """
    Calcula el precio total cuando un SaleItem es guardado, pero no ajusta el stock aquí.
    """
    # Asegúrate de que el objeto es una instancia de SaleItem
    if instance.product and instance.sale:
        # Calcula el precio total para este SaleItem
        instance.price = instance.product.price * instance.quantity

        # Actualiza el precio total de la venta asociada
        instance.sale.update_total_price()

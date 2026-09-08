from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import SaleItem

@receiver(post_save, sender=SaleItem)
@receiver(post_delete, sender=SaleItem)
def update_sale_total_on_item_change(sender, instance, **kwargs):
    """
    Actualiza automáticamente el total_price del modelo Sale cuando se crea,
    modifica o elimina un SaleItem.
    """
    if instance.sale_id:
        instance.sale.update_total_price()


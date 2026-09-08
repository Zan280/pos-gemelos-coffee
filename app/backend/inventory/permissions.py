from rest_framework import permissions

class IsAdminOrSuperuser(permissions.BasePermission):
    """
    Permiso personalizado que permite el acceso exclusivamente a usuarios
    administradores (is_staff, is_superuser o usuario 'MAguirre').
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        is_admin_user = (
            request.user.is_staff or 
            request.user.is_superuser or 
            request.user.username.lower() == 'maguirre'
        )
        return is_admin_user

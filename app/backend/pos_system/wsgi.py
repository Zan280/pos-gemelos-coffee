"""
WSGI config for pos_system project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

sys.path.append('/home/ubuntu/pos_system/pos_system')

sys.path.append('/home/ubuntu/pos_system/venv/lib')


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_system.settings')

application = get_wsgi_application()

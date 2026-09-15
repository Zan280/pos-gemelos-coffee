install docker, open the path until you are in the project directory

run:
docker compose build
docker compose up -d
docker exec -it gemelos_backend python manage.py createsuperuser --username TuUsuario

or using docker compose:
docker compose exec backend python manage.py createsuperuser --username TuUsuario

add an email and a password, and your done.

go to your localhost, and might be there the log in, enter your user and password all ready done in the step before and browser to:
/login = frontend
/admin = backend -Django

Enjoy

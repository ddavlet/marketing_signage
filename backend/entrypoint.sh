#!/bin/sh
set -e

python manage.py makemigrations --no-input
python manage.py migrate --no-input

exec "$@"

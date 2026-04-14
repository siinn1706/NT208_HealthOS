FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel \
	&& pip install -r requirements.txt

COPY . .

FROM base AS dev
COPY requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info"]

FROM base AS prod
CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info"]

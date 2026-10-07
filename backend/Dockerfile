# syntax=docker/dockerfile:1
ARG PYTHON_IMAGE=python:3.13-slim

FROM ${PYTHON_IMAGE} AS builder
ENV PIP_NO_CACHE_DIR=1
WORKDIR /build
COPY requirements/ requirements/
RUN python -m venv /opt/venv && /opt/venv/bin/pip install -r requirements/prod.txt

FROM ${PYTHON_IMAGE} AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings.prod
WORKDIR /app
RUN useradd --system --uid 10001 --no-create-home app
COPY --from=builder /opt/venv /opt/venv
COPY . .
# collectstatic only needs the settings to import; these values are throwaway.
RUN SECRET_KEY=build-only DATABASE_URL=postgres://u:p@localhost/db \
    RESEND_API_KEY=build-only ALLOWED_HOSTS=localhost \
    python manage.py collectstatic --noinput \
    && chown -R app:app /app/staticfiles
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD ["python", "healthcheck.py"]
ENTRYPOINT ["sh", "./entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--access-logfile", "-"]

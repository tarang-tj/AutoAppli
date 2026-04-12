# AutoAppli FastAPI — deploy on Render, Fly.io, Railway, etc.
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Do not `pip install -U pip` here: it can fail hash checks in CI/Docker when the image pip
# and PyPI’s latest pip wheel differ. The image’s pip is enough for these requirements.
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Render sets PORT; local default 8000
EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

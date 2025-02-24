FROM python:3.11-slim

WORKDIR /app

# Poetryのインストール
ENV POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_VERSION=1.7.1

RUN pip install --no-cache-dir poetry==${POETRY_VERSION}

# 依存関係ファイルのコピーとインストール
COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-dev --no-interaction --no-ansi

# アプリケーションのコピー
COPY . .

ENV PORT=8080
ENV HOST=0.0.0.0

CMD ["poetry", "run", "gunicorn", "--bind", "0.0.0.0:8080", "app:app"] 
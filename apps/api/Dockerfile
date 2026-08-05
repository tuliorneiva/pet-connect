FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Sem --reload e respeitando $PORT: o Railway injeta a porta e reload em produção
# roda um supervisor extra e recarrega a cada arquivo tocado. O compose sobrescreve
# este comando para o desenvolvimento local.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

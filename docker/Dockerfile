FROM python:3.8-slim

# Установка зависимостей для сборки пакетов
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копирование requirements.txt и установка зависимостей
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Копирование всего проекта
COPY . /app/

# Порты и команды для запуска
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

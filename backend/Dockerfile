FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    python3-dev \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libglib2.0-0 \
    libgdk-pixbuf2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Create static folder for Nginx
RUN mkdir -p /app/static

# Copy project files
COPY . /app/

# Expose port (Render uses 10000 by default)
EXPOSE 10000

# Entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command - runs after entrypoint
# Default command - use $PORT if available, else default to 10000
CMD ["sh", "-c", "python -m gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-10000} --log-level debug --access-logfile - --error-logfile -"]

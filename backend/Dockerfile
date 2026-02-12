FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies (includes WeasyPrint libs for PDF generation)
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
    libgdk-pixbuf-xlib-2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Create static folder
RUN mkdir -p /app/static

# Copy backend project files
COPY backend/ /app/

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

# Expose port (Render uses 10000 by default)
EXPOSE 10000

# Start Gunicorn – use $PORT env var provided by Render
CMD ["sh", "-c", "python -m gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers 1 --log-level info --access-logfile - --error-logfile -"]

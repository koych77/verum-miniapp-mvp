FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY miniapp/frontend/package.json ./
RUN npm install

COPY miniapp/frontend ./

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY miniapp/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY miniapp/backend/app ./app
COPY --from=frontend-build /frontend/dist ./frontend_dist

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

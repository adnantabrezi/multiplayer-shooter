# Stage 1: Build HTML5 Client with Node.js
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build Go Server
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY server/go.mod server/go.sum ./server/
WORKDIR /app/server
RUN go mod download
WORKDIR /app
COPY server ./server
WORKDIR /app/server
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o mini-militia-server main.go

# Stage 3: Lightweight Production Image
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/server/mini-militia-server ./mini-militia-server

ENV PORT=8080
EXPOSE 8080

CMD ["./mini-militia-server"]

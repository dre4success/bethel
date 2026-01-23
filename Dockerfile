# Stage 1: Build the Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Build the Server
FROM golang:1.24-alpine AS server-builder
WORKDIR /app/server

# Install build dependencies if needed
# RUN apk add --no-cache git

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ .
# Copy built frontend assets to the server directory (static)
COPY --from=client-builder /app/client/dist ./static

# Build the binary
# CGO_ENABLED=0 for static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o bethel-server .

# Stage 3: Runtime
FROM alpine:latest
WORKDIR /root/

# Install CA certificates for potential external requests
RUN apk --no-cache add ca-certificates

COPY --from=server-builder /app/server/bethel-server .
# Copy static files to runtime (if needed, but binary serves from './static' relative to CWD)
# We need to copy the static dir from the builder to the runtime image too!
COPY --from=server-builder /app/server/static ./static

# Expose port
EXPOSE 8080

CMD ["./bethel-server"]

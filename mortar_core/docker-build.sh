#!/bin/bash
# Build and run the Arma Mortar Calculator Docker container
# Usage: ./docker-build.sh [build|run|stop|clean]

set -e

IMAGE_NAME="arma-mortar-calculator"
CONTAINER_NAME="mortar-calc"
PORT="${PORT:-3000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR"

build() {
    echo "Building Docker image: ${IMAGE_NAME}..."
    docker build -t "$IMAGE_NAME" .
    echo "Done. Image: ${IMAGE_NAME}"
}

run() {
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        echo "Container '${CONTAINER_NAME}' is already running on port ${PORT}."
        return
    fi

    # Remove stopped container with same name
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

    echo "Starting container on http://localhost:${PORT}..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "${PORT}:80" \
        --restart unless-stopped \
        "$IMAGE_NAME"
    echo "Running: http://localhost:${PORT}"
}

stop() {
    echo "Stopping container '${CONTAINER_NAME}'..."
    docker stop "$CONTAINER_NAME" 2>/dev/null && docker rm "$CONTAINER_NAME" 2>/dev/null
    echo "Stopped."
}

clean() {
    stop 2>/dev/null || true
    echo "Removing image '${IMAGE_NAME}'..."
    docker rmi "$IMAGE_NAME" 2>/dev/null || true
    echo "Cleaned."
}

case "${1:-build}" in
    build) build ;;
    run)   build && run ;;
    stop)  stop ;;
    clean) clean ;;
    *)
        echo "Usage: $0 {build|run|stop|clean}"
        echo "  build  - Build the Docker image (default)"
        echo "  run    - Build and start the container (port: \$PORT, default 3000)"
        echo "  stop   - Stop and remove the container"
        echo "  clean  - Stop container and remove image"
        exit 1
        ;;
esac

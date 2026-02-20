#!/bin/bash
# E2E Test Runner Script
# Starts Docker container, runs Playwright tests, and cleans up

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Mortar Calculator - E2E Test Runner${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"

# Parse arguments
HEADED=""
PROJECT=""
UI=""
DEBUG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED="--headed"
            shift
            ;;
        --ui)
            UI="true"
            shift
            ;;
        --project)
            PROJECT="--project=$2"
            shift 2
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--headed] [--ui] [--project <name>] [--debug]"
            exit 1
            ;;
    esac
done

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping Docker container...${NC}"
    docker-compose down --remove-orphans 2>/dev/null || true
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Start Docker container
echo -e "\n${GREEN}Starting Docker container...${NC}"
docker-compose up -d --build

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -s http://localhost:3000 > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}Server failed to start after $MAX_ATTEMPTS attempts${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}Server is ready!${NC}"

# Run tests
echo -e "\n${GREEN}Running Playwright tests...${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}\n"

if [ "$UI" = "true" ]; then
    npx playwright test --ui
else
    npx playwright test $HEADED $PROJECT $DEBUG
fi

TEST_EXIT_CODE=$?

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}  All tests passed! ✓${NC}"
else
    echo -e "${RED}  Some tests failed. Exit code: $TEST_EXIT_CODE${NC}"
fi
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"

exit $TEST_EXIT_CODE

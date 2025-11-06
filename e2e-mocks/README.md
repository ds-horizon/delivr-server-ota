# E2E Mocks System Documentation

## Overview

The e2e-mocks system provides a complete mock environment for testing CodePush server functionality. It consists of two main components working together:

1. **MockServer** - A proxy server that intercepts HTTP requests and forwards them to the callback service based on configured expectations
2. **mock-callback** - An Express.js service that handles the actual API logic and data management

## Architecture

```
┌─────────────┐
│   Client    │
│  (E2E Test) │
└──────┬──────┘
       │
       │ HTTP Requests
       ▼
┌─────────────────────────────────────┐
│         MockServer                  │
│      (Port 1080)                    │
│  - Intercepts requests              │
│  - Routes to callback based on      │
│    expectations                     │
└──────┬──────────────────────────────┘
       │
       │ Forwards to callback
       ▼
┌─────────────────────────────────────┐
│      mock-callback                  │
│      (Port 3001)                    │
│  - Express.js API server            │
│  - In-memory data storage           │
│  - File upload/download handling    │
└─────────────────────────────────────┘
```

## Components

### 1. MockServer (mockserver/mockserver:5.12.0)

- **Port**: 1080
- **Purpose**: Acts as a proxy/router that intercepts HTTP requests
- **Configuration**: Uses expectation files from `expectations/` directory
- **Features**:
  - Routes requests to the callback service based on matching patterns
  - Can persist expectations across restarts
  - Logs requests for debugging

### 2. mock-callback Service

- **Port**: 3001
- **Technology**: Node.js + Express.js
- **Purpose**: Implements the actual API endpoints and business logic

#### Key Features:

- **In-Memory Data Storage**: Stores accounts, apps, deployments, releases, tenants, collaborators, and access keys in memory
- **Static Data Loading**: Loads initial data from JSON files in `static-data/` directory on startup
- **File Upload/Download**: Handles package uploads and serves them via `/packages/:fileName` endpoint
- **Package Management**: Stores uploaded ZIP packages in the `packages/` directory (mounted as volume)
- **Hash Computation**: Computes SHA256 hashes for packages using manifest-based approach (matches real implementation)

#### API Endpoints:

- **Authentication**: `/authenticated`
- **Account**: `/account` (GET, POST)
- **Apps**: `/apps`, `/apps/:appName` (GET, POST, PATCH, DELETE)
- **Tenants**: `/tenants`, `/tenants/:tenantId` (GET, DELETE)
- **Collaborators**: `/apps/:appName/collaborators` (GET, POST, PATCH, DELETE)
- **Deployments**: `/apps/:appName/deployments` (GET, POST, PATCH, DELETE)
- **Releases**: `/apps/*/deployments/:deploymentName/release` (POST, PATCH)
- **Access Keys**: `/accessKeys` (GET, POST, PATCH, DELETE)
- **Acquisition** (Public): `/updateCheck`, `/reportStatus/deploy`, `/reportStatus/download`
- **Health**: `/ping`, `/healthcheck`

## Directory Structure

```
e2e-mocks/
├── docker-compose.yml          # Docker Compose configuration
├── register-expectations.sh    # Script to load expectations into MockServer
├── clear-packages.sh           # Script to clear uploaded packages
├── expectations/               # MockServer expectation files (JSON)
│   ├── ping.json
│   ├── account.json
│   ├── apps.json
│   └── ...
├── packages/                   # Storage for uploaded package files (.zip)
├── mock-callback/              # Express.js callback service
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js              # Main server file
│   ├── mock_data.js           # Data storage and initialization
│   ├── routes/                # API route handlers
│   │   ├── account.js
│   │   ├── apps.js
│   │   ├── deployments.js
│   │   └── ...
│   ├── static-data/           # Initial data loaded on startup
│   │   ├── accounts.json
│   │   ├── apps.json
│   │   └── ...
│   └── utils/                 # Utility modules
│       ├── auth.js
│       ├── file-storage.js
│       └── response.js
```

## How to Start the Server

### Prerequisites

- Docker and Docker Compose installed
- Ports 1080 and 3001 available

### Starting the Services

1. **Start both services using Docker Compose**:
   ```bash
   cd e2e-mocks
   docker-compose up -d
   ```

   This will:
   - Start MockServer on port 1080
   - Build and start mock-callback service on port 3001
   - Mount the `packages/` directory as a volume for file storage

2. **Register expectations with MockServer**:
   ```bash
   ./register-expectations.sh
   ```

   This script:
   - Clears any existing expectations
   - Loads all JSON files from `expectations/` directory
   - Registers them with MockServer

### Verification

- Check MockServer is running:
  ```bash
  curl http://localhost:1080/mockserver/retrieve?type=ACTIVE_EXPECTATIONS
  ```

- Check mock-callback is running:
  ```bash
  curl http://localhost:3001/ping
  # Should return: {"message":"pong"}
  ```

## How to Restart the Server

### Full Restart (Both Services)

1. **Stop the services**:
   ```bash
   docker-compose down
   ```

2. **Start again**:
   ```bash
   docker-compose up -d
   ```

3. **Re-register expectations** (required after MockServer restart):
   ```bash
   ./register-expectations.sh
   ```

### Restart Individual Service

**Restart MockServer only**:
```bash
docker-compose restart mockserver
./register-expectations.sh  # Re-register expectations
```

**Restart mock-callback only**:
```bash
docker-compose restart mock-callback
# No need to re-register expectations
```

### Quick Restart (Without Rebuilding)

If you only need to restart without rebuilding:
```bash
docker-compose restart
./register-expectations.sh  # Re-register expectations for MockServer
```

### Rebuild and Restart (After Code Changes)

If you've made changes to the mock-callback code:
```bash
docker-compose down
docker-compose up -d --build
./register-expectations.sh
```

## Environment Variables

### MockServer

- `MOCKSERVER_LOG_LEVEL`: Logging level (default: INFO)
- `MOCKSERVER_PERSIST_EXPECTATIONS`: Whether to persist expectations (default: "true")

### mock-callback

- `PORT`: Server port (default: 3001)
- `LOG_LEVEL`: Set to "debug" for request logging (default: empty)
- `UPLOAD_SIZE_LIMIT_MB`: File upload size limit in MB
  - Default: 10240 MB (10GB)
  - Set to `0` for unlimited (uses 1TB as practical max)
  - Any positive number for specific limit
- `STORAGE_DIR`: Directory for storing packages (default: `/tmp/codepush-packages`)

## Data Management

### Initial Data

The mock-callback service loads initial data from JSON files in `mock-callback/static-data/` on startup:
- `accounts.json` - User accounts
- `apps.json` - Applications
- `accesskeys.json` - API access keys
- `tenants.json` - Organizations/tenants
- `collaborators.json` - App collaborator permissions
- `deployments.json` - Deployment environments

### Data Persistence

- **In-memory storage**: All data is stored in memory and will be lost on service restart
- **File packages**: Uploaded packages persist in the `packages/` directory (mounted volume)
- **Static data**: Reloaded from JSON files on each startup

### Clearing Data

**Clear uploaded packages**:
```bash
./clear-packages.sh
```

**Reset all data**: Restart the mock-callback service (data is in-memory, so restart clears it)

## Troubleshooting

### Services Not Starting

1. Check if ports are in use:
   ```bash
   lsof -i :1080
   lsof -i :3001
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs mockserver
   docker-compose logs mock-callback
   ```

### Expectations Not Working

1. Verify expectations are registered:
   ```bash
   curl http://localhost:1080/mockserver/retrieve?type=ACTIVE_EXPECTATIONS | jq .
   ```

2. Re-register expectations:
   ```bash
   ./register-expectations.sh
   ```

### File Upload Issues

1. Check available disk space in the `packages/` directory
2. Verify file size is within `UPLOAD_SIZE_LIMIT_MB` limit
3. Check Docker volume mount is working:
   ```bash
   docker-compose exec mock-callback ls -la /tmp/codepush-packages
   ```

## Development

### Making Changes to mock-callback

1. Edit files in `mock-callback/` directory
2. Rebuild and restart:
   ```bash
   docker-compose up -d --build mock-callback
   ```

### Adding New Expectations

1. Create a new JSON file in `expectations/` directory
2. Follow the MockServer expectation format (see existing files for examples)
3. Run `./register-expectations.sh` to load it

### Debugging

Enable debug logging:
```bash
docker-compose up -d -e LOG_LEVEL=debug mock-callback
```

Or edit `docker-compose.yml` to add:
```yaml
environment:
  LOG_LEVEL: debug
```

## Notes

- MockServer expectations are cleared on restart unless `MOCKSERVER_PERSIST_EXPECTATIONS` is set
- The mock-callback service initializes preconfigured data on startup (see `mock_data.js`)
- Package files are stored with unique names: `{timestamp}-{random}.zip`
- The system supports both `/apps/appName/...` and `/apps/tenant/appName/...` URL patterns


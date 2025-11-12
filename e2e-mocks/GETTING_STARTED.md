# Getting Started with CodePush Mock APIs

This guide will help you set up the mock API server.

## Prerequisites

- **Docker** and **Docker Compose** installed

## Configuration

The mock services use environment variables for configuration defined in the `.env` file.

### Default Ports

The `.env` file contains the default port configuration:
- **MockServer**: port 1080
- **mock-callback**: port 3001

### Customizing Ports

**Option 1: Edit the `.env` file**

Customize the values in the `.env` file:
```bash
# Edit .env to change port values
vi .env  # or use your preferred editor
```

**Option 2: Set environment variables**

```bash
export MOCKSERVER_PORT=1080
export MOCK_CALLBACK_PORT=3001
docker-compose up -d
```

**Option 3: Inline environment variables**

```bash
MOCKSERVER_PORT=1080 MOCK_CALLBACK_PORT=3001 docker-compose up -d
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCKSERVER_PORT` | 1080 | Port for MockServer API gateway |
| `MOCKSERVER_HOST` | localhost | Host for MockServer (used by scripts) |
| `MOCK_CALLBACK_PORT` | 3001 | Port for mock-callback service |

## Quick Start

### Step 1: Start the Mock Services

Navigate to the `e2e-mocks` directory and start the services:

```bash
cd delivr-server-ota/e2e-mocks
docker-compose up -d
```

This starts two services:
- **MockServer** (port 1080) - API gateway
- **mock-callback** (port 3001) - Mock logic service

Wait a few seconds for services to start, then verify:

```bash
docker-compose ps
```

Both services should show "Up" status.

### Step 2: Register Mock Expectations

Register all mock API expectations with MockServer:

```bash
# Use the provided script
./register-expectations.sh
```

Or manually:

```bash
# Clear any existing expectations
curl -X PUT "http://localhost:1080/mockserver/clear"

# Register all expectations
for file in expectations/*.json; do
  echo "Registering $file"
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done

echo "All expectations registered!"
```

## API Endpoints

The mock server provides the following API endpoints:

- **Account**: `/account` - User account management
- **Apps**: `/apps` - Application management
- **Deployments**: `/apps/{appName}/deployments` - Deployment environment management
- **Releases**: `/apps/{appName}/deployments/{deploymentName}/release` - Package release management
- **Collaborators**: `/apps/{appName}/collaborators` - App collaborator management
- **Tenants**: `/tenants` - Organization/tenant management
- **Access Keys**: `/accessKeys` - API key management
- **Authentication**: `/authenticated` - Authentication status check
- **Update Check**: `/updateCheck` or `/v0.1/public/codepush/update_check` - Client update checking (public)
- **File Download**: `/packages/{filename}` - Package file downloads (public)

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild if needed
docker-compose up --build -d
```

### Check service status

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs mock-callback
docker-compose logs mockserver
```

## Stopping the Services

When you're done:

```bash
docker-compose down
```

To stop and remove all data:

```bash
docker-compose down -v
```

## Resetting Mock Data

To clear all mock data and start fresh:

```bash
# Restart the mock-callback service (clears all in-memory data)
docker-compose restart mock-callback

# Wait for service to be ready
sleep 3
```

This will reset all in-memory data including:
- Accounts
- Apps
- Deployments
- Collaborators
- Tenants
- Access Keys

**Note:** Expectations are stored separately in MockServer and typically don't need to be re-registered.

## File Upload and Storage

The mock server supports file uploads for releases:

- **File Storage**: Uploaded files are stored in `/tmp/codepush-packages` inside the container
- **File Upload**: POST release endpoint accepts multipart/form-data with a file field named `package`
- **File Download**: Files can be downloaded via `/packages/{filename}` endpoint
- **Hash Computation**: When files are uploaded, actual SHA256 hash and file size are computed
- **Backward Compatible**: JSON-only releases (without files) still work for backward compatibility

### File Size Limit Configuration

**Default Behavior:**
- Default limit: **10GB (10240 MB)** - large enough for most practical purposes
- No configuration needed unless you want unlimited or a different limit

**Setting Unlimited Uploads:**

To allow truly unlimited file uploads (practical maximum of 1TB), set the limit to `0`:

```yaml
# In docker-compose.yml
mock-callback:
  environment:
    PORT: 3001
    UPLOAD_SIZE_LIMIT_MB: 0  # Unlimited (1TB practical maximum)
```

**Setting a Specific Limit:**

To set a custom limit (e.g., 500MB):

```yaml
mock-callback:
  environment:
    PORT: 3001
    UPLOAD_SIZE_LIMIT_MB: 500  # 500MB limit
```

**After changing the limit, restart the services:**
```bash
docker-compose down
docker-compose up -d
```

**Error Response:**

If a file exceeds the limit, the API will return a `413 Payload Too Large` error with a message indicating the size limit.

## Architecture

The mock server consists of two components:

1. **MockServer** (port 1080)
   - Acts as the API gateway
   - Routes requests based on registered expectations
   - Stores expectations independently from data

2. **mock-callback** (port 3001)
   - Handles the actual business logic
   - Maintains in-memory data storage
   - Processes file uploads and downloads

## Notes

- **Authentication**: This is a mock server - any valid Bearer token format will work for authenticated endpoints
- **In-Memory Storage**: All data is stored in memory and will be lost when the `mock-callback` service restarts
- **File Storage**: Uploaded files persist in `/tmp/codepush-packages` inside the container until the container is removed
- **Pre-configured Data**: Initial test data is automatically created on startup (see `mock-callback/mock_data.js`)
- **File Upload Limit**: Default is 10GB (10240 MB), configurable via `UPLOAD_SIZE_LIMIT_MB` environment variable

## Additional Resources

For more detailed information:
- Check individual route files in `mock-callback/routes/` for endpoint-specific logic
- See `mock_data.js` for the data structure and available operations
- Review `expectations/*.json` for MockServer expectation configurations


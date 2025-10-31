# Getting Started with CodePush Mock APIs

This guide will help you set up and test the CodePush mock API server using curl commands.

## Prerequisites

- **Docker** and **Docker Compose** installed
- **curl** command-line tool
- **jq** (optional, for pretty JSON output): `brew install jq` or install via your package manager

## Quick Start

### Step 1: Start the Mock Services

Navigate to the `e2e-mocks` directory and start the services:

```bash
cd code-push-server/e2e-mocks
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

### Step 3: Test the Mock APIs

Now you can test any endpoint! Start with creating an account:

```bash
# Set a user ID for your session
export USER_ID="my-test-user"

# Create an account
curl -X POST "http://localhost:1080/account" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "account": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }' | jq .
```

## Testing Different Endpoints

### 1. Account Endpoints

```bash
# Get account (must create first)
curl -X GET "http://localhost:1080/account" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Create account (returns account ID)
curl -X POST "http://localhost:1080/account" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "account": {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  }' | jq .
```

### 2. Apps Endpoints

```bash
# List all apps
curl -X GET "http://localhost:1080/apps" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Create an app
curl -X POST "http://localhost:1080/apps" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name": "MyApp"}' | jq .

# Get specific app
curl -X GET "http://localhost:1080/apps/MyApp" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Update app name
curl -X PATCH "http://localhost:1080/apps/MyApp" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name": "MyUpdatedApp"}' | jq .

# Delete app
curl -X DELETE "http://localhost:1080/apps/MyApp" \
  -H "Authorization: Bearer ${USER_ID}"
```

### 3. Deployments Endpoints

```bash
# List deployments for an app
curl -X GET "http://localhost:1080/apps/MyApp/deployments" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Create a deployment
curl -X POST "http://localhost:1080/apps/MyApp/deployments" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production"}' | jq .

# Get specific deployment
curl -X GET "http://localhost:1080/apps/MyApp/deployments/Production" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Update deployment name
curl -X PATCH "http://localhost:1080/apps/MyApp/deployments/Production" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Prod"}' | jq .

# Delete deployment
curl -X DELETE "http://localhost:1080/apps/MyApp/deployments/Production" \
  -H "Authorization: Bearer ${USER_ID}"
```

### 4. Releases Endpoints

```bash
# Get release history
curl -X GET "http://localhost:1080/apps/MyApp/deployments/Production/history" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Create a release
curl -X POST "http://localhost:1080/apps/MyApp/deployments/Production/release" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "packageInfo": {
      "appVersion": "1.0.0",
      "description": "Initial release",
      "isMandatory": false,
      "rollout": 100
    }
  }' | jq .

# Update release properties
curl -X PATCH "http://localhost:1080/apps/MyApp/deployments/Production/release" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "packageInfo": {
      "isDisabled": false,
      "rollout": 50
    }
  }' | jq .

# Delete release history
curl -X DELETE "http://localhost:1080/apps/MyApp/deployments/Production/history" \
  -H "Authorization: Bearer ${USER_ID}"
```

### 5. Collaborators Endpoints

```bash
# List collaborators
curl -X GET "http://localhost:1080/apps/MyApp/collaborators" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Add collaborator
curl -X POST "http://localhost:1080/apps/MyApp/collaborators/user@example.com" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"permission": "Collaborator"}' | jq .

# Update collaborator role
curl -X PATCH "http://localhost:1080/apps/MyApp/collaborators/user@example.com" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"role": "Owner"}' | jq .

# Remove collaborator
curl -X DELETE "http://localhost:1080/apps/MyApp/collaborators/user@example.com" \
  -H "Authorization: Bearer ${USER_ID}"
```

### 6. Tenants/Organizations Endpoints

```bash
# List tenants
curl -X GET "http://localhost:1080/tenants" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Delete tenant
curl -X DELETE "http://localhost:1080/tenants/tenant-id" \
  -H "Authorization: Bearer ${USER_ID}"
```

### 7. Access Keys Endpoints

```bash
# List access keys
curl -X GET "http://localhost:1080/accessKeys" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Create access key
curl -X POST "http://localhost:1080/accessKeys" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "friendlyName": "CI/CD Key",
    "ttl": 86400
  }' | jq .

# Get specific access key
curl -X GET "http://localhost:1080/accessKeys/CI-CD-Key" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Update access key
curl -X PATCH "http://localhost:1080/accessKeys/CI-CD-Key" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"ttl": 172800}' | jq .

# Delete access key
curl -X DELETE "http://localhost:1080/accessKeys/CI-CD-Key" \
  -H "Authorization: Bearer ${USER_ID}"

# Delete sessions by creator
curl -X DELETE "http://localhost:1080/sessions/my-user-id" \
  -H "Authorization: Bearer ${USER_ID}"
```

### 8. Authentication Endpoints

```bash
# Check authentication status
curl -X GET "http://localhost:1080/authenticated" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# With access key
curl -X GET "http://localhost:1080/authenticated" \
  -H "Authorization: Bearer cli-YourAccessKeyName" | jq .
```

### 9. Update Check Endpoint (Public - No Auth)

```bash
# First, get a deployment key (from step 3 above)
# Then check for updates
curl -X GET "http://localhost:1080/updateCheck?deploymentKey=YOUR_DEPLOYMENT_KEY&appVersion=1.0.0" | jq .

# Example with older version (should return update)
curl -X GET "http://localhost:1080/updateCheck?deploymentKey=YOUR_DEPLOYMENT_KEY&appVersion=0.9.0" | jq .

# New API format
curl -X GET "http://localhost:1080/v0.1/public/codepush/update_check?deployment_key=YOUR_DEPLOYMENT_KEY&app_version=1.0.0" | jq .
```

## Complete Example Workflow

Here's a complete workflow example:

```bash
# 1. Set user ID
export USER_ID="test-user-$(date +%s)"

# 2. Create account
curl -X POST "http://localhost:1080/account" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"account": {"name": "Test User", "email": "test@example.com"}}' | jq .

# 3. Create app
APP_NAME=$(curl -s -X POST "http://localhost:1080/apps" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name": "MyTestApp"}' | jq -r '.app.name')
echo "Created app: ${APP_NAME}"

# 4. Create deployment
DEPLOY_KEY=$(curl -s -X POST "http://localhost:1080/apps/${APP_NAME}/deployments" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production"}' | jq -r '.deployment.key')
echo "Deployment key: ${DEPLOY_KEY}"

# 5. Release package
curl -X POST "http://localhost:1080/apps/${APP_NAME}/deployments/Production/release" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "packageInfo": {
      "appVersion": "1.0.0",
      "description": "First release"
    }
  }' | jq .

# 6. Check for updates
curl -X GET "http://localhost:1080/updateCheck?deploymentKey=${DEPLOY_KEY}&appVersion=0.9.0" | jq .
```

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

### Getting "Not handled" errors?

Make sure you've registered all expectations:

```bash
curl -X PUT "http://localhost:1080/mockserver/clear"
for file in expectations/*.json; do
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done
```

### Mock data not persisting?

Mock data is stored in memory and resets when you restart the `mock-callback` service. To test with fresh data, restart the service:

```bash
docker-compose restart mock-callback
```

**Important:** This will clear all data (accounts, apps, deployments, etc.) and start fresh. After restarting, you'll need to re-register the expectations:

```bash
# Restart mock-callback to clear all data
docker-compose restart mock-callback

# Wait a moment for service to start
sleep 3

# Re-register expectations (data is stored separately from expectations)
for file in expectations/*.json; do
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done
```

### Check service status

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs mock-callback
docker-compose logs mockserver

# Test MockServer is responding
curl http://localhost:1080

# Test mock-callback is responding
curl http://localhost:3001/account -H "Authorization: Bearer test"
```

## Stopping the Services

When you're done testing:

```bash
docker-compose down
```

To stop and remove all data:

```bash
docker-compose down -v
```

## Next Steps

- See `OVERVIEW.md` for architecture details
- See `ARCHITECTURE.md` for technical implementation
- Check individual route files in `mock-callback/routes/` for endpoint-specific logic

## Resetting Mock Data

To clear all mock data and start fresh:

```bash
# Restart the mock-callback service (clears all in-memory data)
docker-compose restart mock-callback

# Wait for service to be ready
sleep 3

# Re-register expectations (if needed)
for file in expectations/*.json; do
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done

echo "Mock data cleared and ready for fresh testing!"
```

This is useful when:
- You want to test with a clean slate
- You get "already exists" errors and want to clear duplicates
- You want to reset all accounts, apps, deployments, etc.

**Note:** Expectations are stored separately from mock data, so they typically don't need to be re-registered unless you've cleared MockServer's state entirely.

## Notes

- **User IDs**: Use any string as a user ID in the Authorization header (e.g., `Bearer my-user-id`)
- **No Real Authentication**: This is a mock, so any valid format user ID will work
- **In-Memory Storage**: All data is stored in memory and will be lost when the service restarts
- **Mock Data**: Initial test data can be found in `mock-callback/mock_data.js`
- **Clearing Data**: Restart `mock-callback` service to clear all in-memory data and start fresh


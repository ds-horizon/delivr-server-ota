const db = require('../mock_data');
const { json, html, fieldErr, sendError } = require('../utils/response');

const { getUserId } = require('../utils/auth');

// Helper: Extract tenant ID from header
function getTenantId(req) {
  const tenant = req.headers.tenant;
  return Array.isArray(tenant) ? tenant[0] : tenant || null;
}

// Helper: Check if user is owner
function isOwner(accountId, appId) {
  const collab = db.getCollaboratorForApp(accountId, appId);
  return collab && collab.permission === 'Owner';
}

// Helper: Check if user has collaborator access
function hasAccess(accountId, appId) {
  return db.getCollaboratorForApp(accountId, appId) !== undefined;
}

// Helper: Validate app name
function isValidAppName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

// GET /apps - Get all apps for account
function getApps(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = getTenantId(req);
  const apps = db.getApps(accountId, tenantId);

  // Get deployments for each app
  const appsWithDeployments = apps.map(app => {
    const appDeployments = db.getDeployments(app.id);
    const deploymentNames = appDeployments.map(d => d.name);
    return {
      id: app.id,
      name: app.name,
      displayName: app.name,
      deployments: deploymentNames,
      createdTime: app.createdTime,
      tenantId: app.tenantId || null
    };
  });

  // Sort by name
  appsWithDeployments.sort((a, b) => a.name.localeCompare(b.name));

  return res.status(200).json({ apps: appsWithDeployments });
}

// POST /apps - Create a new app
// Apps are always static - validates all scenarios but doesn't save
// Matches real implementation: creates new app with generated ID
function postApps(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const account = db.getAccount(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const appRequest = req.body;
  
  // Validation: name is required (matches real implementation)
  if (!appRequest || !isValidAppName(appRequest.name)) {
    return res.status(400).json([{ field: 'name', message: 'App name is required and must be a valid string' }]);
  }

  // Check for duplicate app name (matches real implementation behavior)
  if (db.isDuplicateApp(accountId, appRequest)) {
    return res.status(409).json({ error: `An app named '${appRequest.name}' already exists.` });
  }

  // Handle tenant validation if tenantId is provided
  let tenantId = appRequest.tenantId || null;
  
  // If tenantId is provided, check if tenant exists in static data
  if (tenantId) {
    const tenant = db.getTenant(tenantId);
    if (!tenant) {
      // Tenant doesn't exist in static data - return error
      return res.status(404).json({ error: `Tenant "${tenantId}" does not exist.` });
    }
  }

  // Apps are static - validate all scenarios but don't save
  // Generate a mock app ID (matching real implementation which generates ID)
  // In real implementation: app.id = shortid.generate()
  const mockAppId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mockCreatedTime = Date.now();

  // Determine deployment names (matches real implementation)
  let deploymentNames = [];
  if (!appRequest.manuallyProvisionDeployments) {
    deploymentNames = ['Production', 'Staging'];
  }

  // Set Location header (matches real implementation)
  res.setHeader('Location', `/apps/${appRequest.name.trim()}`);

  // Return success response as if app was created (matches real implementation)
  return res.status(201).json({
    app: {
      id: mockAppId,
      name: appRequest.name.trim(),
      displayName: appRequest.name.trim(),
      deployments: deploymentNames,
      createdTime: mockCreatedTime,
      tenantId: tenantId || null
    }
  });
}

// GET /apps/:appName - Get a specific app
function getApp(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const appName = req.params.appName;
  const tenantId = getTenantId(req);
  
  const app = db.getAppByName(accountId, appName, tenantId);
  if (!app) {
    return res.status(404).json({ error: `App "${appName}" does not exist.` });
  }

  // Check access
  if (!hasAccess(accountId, app.id)) {
    return res.status(403).json({ error: 'You do not have access to this app' });
  }

  const appDeployments = db.getDeployments(app.id);
  const deploymentNames = appDeployments.map(d => d.name);

  return res.status(200).json({
    app: {
      id: app.id,
      name: app.name,
      displayName: app.name,
      deployments: deploymentNames,
      createdTime: app.createdTime,
      tenantId: app.tenantId || null
    }
  });
}

// DELETE /apps/:appName - Delete an app
// Apps are always static - validates all scenarios but doesn't delete
function deleteApp(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const appName = req.params.appName;
  const tenantId = getTenantId(req);
  
  const app = db.getAppByName(accountId, appName, tenantId);
  if (!app) {
    return res.status(404).json({ error: `App "${appName}" does not exist.` });
  }

  // Check if user is owner
  if (!isOwner(accountId, app.id)) {
    return res.status(403).json({ error: 'This action requires Owner permissions on the app!' });
  }

  // Apps are static - validate all scenarios but don't delete
  // Return success response as if app was deleted (matches real implementation)
  return res.status(201).send('App deleted successfully');
}

// PATCH /apps/:appName - Update an app (change name)
// Apps are always static - validates all scenarios but doesn't update
function patchApp(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const appName = req.params.appName;
  const tenantId = getTenantId(req);
  const appRequest = req.body;

  // Get existing app
  const existingApp = db.getAppByName(accountId, appName, tenantId);
  if (!existingApp) {
    return res.status(404).json({ error: `App "${appName}" does not exist.` });
  }

  // Check if user is owner
  if (!isOwner(accountId, existingApp.id)) {
    return res.status(403).json({ error: 'This action requires Owner permissions on the app!' });
  }

  // If name is being changed
  if (appRequest.name !== undefined && appRequest.name !== existingApp.name) {
    // Validate new name
    if (!isValidAppName(appRequest.name)) {
      return res.status(400).json([{ field: 'name', message: 'App name is required and must be a valid string' }]);
    }

    // Check for duplicate name
    const userApps = db.getApps(accountId);
    const duplicateApp = userApps.find(app => app.name === appRequest.name && app.id !== existingApp.id);
    if (duplicateApp) {
      return res.status(409).json({ error: `An app named '${appRequest.name}' already exists.` });
    }

    // Apps are static - validate all scenarios but don't update
    // Use the new name for response, but don't save to database
  }

  // Get deployments for response
  const appDeployments = db.getDeployments(existingApp.id);
  const deploymentNames = appDeployments.map(d => d.name);

  // Return app with original data (or new name in response if validated)
  // Apps are static, so we return the existing app data
  const responseAppName = (appRequest.name !== undefined && appRequest.name !== existingApp.name && isValidAppName(appRequest.name))
    ? appRequest.name.trim()
    : existingApp.name;

  return res.status(200).json({
    app: {
      id: existingApp.id,
      name: responseAppName,
      displayName: responseAppName,
      deployments: deploymentNames,
      createdTime: existingApp.createdTime,
      tenantId: existingApp.tenantId || null
    }
  });
}

module.exports = {
  getApps,
  postApps,
  getApp,
  deleteApp,
  patchApp
};


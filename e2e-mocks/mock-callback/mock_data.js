// ============================================================================
// DATA STORAGE - In-memory arrays for each entity type
// ============================================================================

let accounts = [];        // User accounts
let apps = [];            // Applications
let deployments = [];     // Deployment environments
let accessKeys = [];      // API access keys
let tenants = [];         // Organizations/tenants
let collaborators = [];  // App collaborator permissions

// Counters (not used in current implementation, kept for potential future use)
let accountIdCounter = 1;
let appIdCounter = 1;
let deploymentIdCounter = 1;
let deploymentKeyCounter = 1;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const fs = require('fs');
const path = require('path');

/**
 * Generates a unique ID for entities
 * Format: {prefix}-{timestamp}-{random}
 * Example: "app-1761906891983-a6ibczhvn"
 */
function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load static accounts data from JSON file
 * Returns empty array if file doesn't exist or can't be read
 */
function loadStaticAccounts() {
  try {
    const staticDataPath = path.join(__dirname, 'static-data', 'accounts.json');
    if (fs.existsSync(staticDataPath)) {
      const fileContent = fs.readFileSync(staticDataPath, 'utf8');
      const staticAccounts = JSON.parse(fileContent);
      return Array.isArray(staticAccounts) ? staticAccounts : [];
    }
  } catch (error) {
    console.error('Error loading static accounts data:', error);
  }
  return [];
}

/**
 * Load static apps data from JSON file
 * Returns empty array if file doesn't exist or can't be read
 */
function loadStaticApps() {
  try {
    const staticDataPath = path.join(__dirname, 'static-data', 'apps.json');
    if (fs.existsSync(staticDataPath)) {
      const fileContent = fs.readFileSync(staticDataPath, 'utf8');
      const staticApps = JSON.parse(fileContent);
      return Array.isArray(staticApps) ? staticApps : [];
    }
  } catch (error) {
    console.error('Error loading static apps data:', error);
  }
  return [];
}

/**
 * Load static access keys data from JSON file
 * Returns empty array if file doesn't exist or can't be read
 */
function loadStaticAccessKeys() {
  try {
    const staticDataPath = path.join(__dirname, 'static-data', 'accesskeys.json');
    if (fs.existsSync(staticDataPath)) {
      const fileContent = fs.readFileSync(staticDataPath, 'utf8');
      const staticAccessKeys = JSON.parse(fileContent);
      return Array.isArray(staticAccessKeys) ? staticAccessKeys : [];
    }
  } catch (error) {
    console.error('Error loading static access keys data:', error);
  }
  return [];
}

/**
 * Load static tenants data from JSON file
 * Returns empty array if file doesn't exist or can't be read
 */
function loadStaticTenants() {
  try {
    const staticDataPath = path.join(__dirname, 'static-data', 'tenants.json');
    if (fs.existsSync(staticDataPath)) {
      const fileContent = fs.readFileSync(staticDataPath, 'utf8');
      const staticTenants = JSON.parse(fileContent);
      return Array.isArray(staticTenants) ? staticTenants : [];
    }
  } catch (error) {
    console.error('Error loading static tenants data:', error);
  }
  return [];
}

/**
 * Load static collaborators data from JSON file
 * Returns empty array if file doesn't exist or can't be read
 */
function loadStaticCollaborators() {
  try {
    const staticDataPath = path.join(__dirname, 'static-data', 'collaborators.json');
    if (fs.existsSync(staticDataPath)) {
      const fileContent = fs.readFileSync(staticDataPath, 'utf8');
      const staticCollaborators = JSON.parse(fileContent);
      return Array.isArray(staticCollaborators) ? staticCollaborators : [];
    }
  } catch (error) {
    console.error('Error loading static collaborators data:', error);
  }
  return [];
}

/**
 * Load static deployments data from JSON file
 * Returns empty array if file doesn't exist or can't be read
 */
function loadStaticDeployments() {
  try {
    const staticDataPath = path.join(__dirname, 'static-data', 'deployments.json');
    if (fs.existsSync(staticDataPath)) {
      const fileContent = fs.readFileSync(staticDataPath, 'utf8');
      const staticDeployments = JSON.parse(fileContent);
      return Array.isArray(staticDeployments) ? staticDeployments : [];
    }
  } catch (error) {
    console.error('Error loading static deployments data:', error);
  }
  return [];
}

// ============================================================================
// MODULE EXPORTS - Public API for route handlers
// ============================================================================

module.exports = {
  // ========================================================================
  // ACCOUNT OPERATIONS
  // ========================================================================
  // Accounts represent user accounts in the system
  // Fields: id, name, email, linkedProviders[]
  accounts,
  addAccount: (account) => {
    const id = generateId('account');
    const newAccount = { ...account, id };
    accounts.push(newAccount);
    return id;
  },
  getAccount: (accountId) => accounts.find(a => a.id === accountId),
  getAccountByEmail: (email) => accounts.find(a => a.email && a.email.toLowerCase() === email.toLowerCase()),

  // ========================================================================
  // APP OPERATIONS
  // ========================================================================
  // Apps represent applications that belong to accounts
  // Fields: id, name, accountId, tenantId, createdTime
  // Relationships: belongs to account, may belong to tenant, has deployments & collaborators
  apps,
  addApp: (app) => {
    const id = generateId('app');
    const newApp = { ...app, id, createdTime: Date.now() };
    apps.push(newApp);
    return newApp;
  },
  getApps: (accountId, tenantId = null) => {
    let userApps = apps.filter(app => {
      // Check if user is collaborator or owner
      const collab = collaborators.find(c => 
        c.accountId === accountId && c.appId === app.id
      );
      return collab !== undefined;
    });

    // Filter by tenant if provided
    if (tenantId) {
      userApps = userApps.filter(app => app.tenantId === tenantId);
    }

    return userApps;
  },
  getAppByName: (accountId, appName, tenantId = null) => {
    const userApps = module.exports.getApps(accountId, tenantId);
    return userApps.find(app => app.name === appName);
  },
  appExists: (appName, tenantId = null) => {
    // Check if app exists regardless of user access
    let searchApps = apps;
      if (tenantId) {
        searchApps = apps.filter(app => app.tenantId === tenantId);
      }
      const found = searchApps.find(app => app.name === appName);
    return found;
  },
  deleteApp: (accountId, appId) => {
    const index = apps.findIndex(app => app.id === appId);
    if (index !== -1) {
      // Delete app
      apps.splice(index, 1);
      // Delete associated deployments
      deployments = deployments.filter(d => d.appId !== appId);
      // Delete associated collaborators
      collaborators = collaborators.filter(c => c.appId !== appId);
      return true;
    }
    return false;
  },
  isDuplicateApp: (accountId, appRequest) => {
    const userApps = module.exports.getApps(accountId);
    const existingApp = userApps.find(app => {
      // Check by name
      if (app.name === appRequest.name) {
        // If tenantId is provided, also check tenant
        if (appRequest.tenantId && app.tenantId !== appRequest.tenantId) {
          return false;
        }
        return true;
      }
      return false;
    });
    return existingApp !== undefined;
  },
  updateApp: (accountId, appId, updates) => {
    const app = apps.find(a => a.id === appId);
    if (!app) {
      throw new Error('App not found');
    }
    // Update app fields
    if (updates.name !== undefined) {
      app.name = updates.name;
    }
    return app;
  },

  // ========================================================================
  // DEPLOYMENT OPERATIONS
  // ========================================================================
  // Deployments represent deployment environments (Production, Staging, etc.)
  // Fields: id, name, key, appId, createdTime, package (current), packageHistory[]
  // Relationships: belongs to app, contains package history
  deployments,
  addDeployment: (deployment) => {
    const id = generateId('deployment');
    const key = deployment.key || `deployment-key-${deploymentKeyCounter++}`;
    const newDeployment = { ...deployment, id, key, createdTime: Date.now() };
    deployments.push(newDeployment);
    return newDeployment;
  },
  getDeployments: (appId) => deployments.filter(d => d.appId === appId),
  getDeploymentById: (deploymentId) => deployments.find(d => d.id === deploymentId),
  getDeploymentByKey: (deploymentKey) => deployments.find(d => d.key === deploymentKey),
  deleteDeployment: (appId, deploymentId) => {
    const index = deployments.findIndex(d => d.appId === appId && d.id === deploymentId);
    if (index !== -1) {
      deployments.splice(index, 1);
      return true;
    }
    return false;
  },
  deleteDeploymentsByAppId: (appId) => {
    deployments = deployments.filter(d => d.appId !== appId);
  },
  updateDeployment: (appId, deploymentId, updates) => {
    const deployment = deployments.find(d => d.appId === appId && d.id === deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }
    // Update deployment fields
    if (updates.name !== undefined) {
      deployment.name = updates.name;
    }
    return deployment;
  },
  
// ========================================================================
// PACKAGE/RELEASE MANAGEMENT
// ========================================================================
// Packages represent code releases deployed to a deployment environment
// Stored in deployment.packageHistory[] array
// Fields: label (v1, v2, v3...), appVersion, blobUrl, packageHash, rollout, etc.
getPackageHistory: (deploymentId) => {
  const deployment = deployments.find(d => d.id === deploymentId);
  if (!deployment) return [];
  return deployment.packageHistory || [];
},

commitPackage: (deploymentId, appPackage) => {
  const deployment = deployments.find(d => d.id === deploymentId);
  if (!deployment) {
    throw new Error('Deployment not found');
  }

  if (!deployment.packageHistory) {
    deployment.packageHistory = [];
  }

  const history = deployment.packageHistory;
  let label;
  if (history.length === 0) {
    label = 'v1';
  } else {
    const lastLabel = history[history.length - 1].label;
    const lastVersion = parseInt(lastLabel.substring(1));
    label = 'v' + (lastVersion + 1);
  }

  const packageData = {
    ...appPackage,
    label,
    uploadTime: appPackage.uploadTime || Date.now(),
    releaseMethod: appPackage.releaseMethod || 'Upload',
    isBundlePatchingEnabled: appPackage.isBundlePatchingEnabled || false 
  };

  deployment.packageHistory.push(packageData);
  deployment.package = packageData;

  if (deployment.packageHistory.length > 100) {
    deployment.packageHistory = deployment.packageHistory.slice(-100);
  }

  return packageData;
},

updatePackageInHistory: (deploymentId, label, updates) => {
  const deployment = deployments.find(d => d.id === deploymentId);
  if (!deployment || !deployment.packageHistory) {
    throw new Error('Deployment not found or has no history');
  }

  for (let i = deployment.packageHistory.length - 1; i >= 0; i--) {
    if (deployment.packageHistory[i].label === label) {

      // ✅ Ensure the field is included during updates
      const updatedData = {
        ...updates,
        isBundlePatchingEnabled: updates.isBundlePatchingEnabled || false,
      };

      Object.assign(deployment.packageHistory[i], updatedData);

      if (deployment.package && deployment.package.label === label) {
        Object.assign(deployment.package, updatedData);
      }

      return deployment.packageHistory[i];
    }
  }

  throw new Error('Package with label not found');
},

updatePackageHistory: (deploymentId, packageHistory) => {
  const deployment = deployments.find(d => d.id === deploymentId);
  if (!deployment) {
    throw new Error('Deployment not found');
  }

  deployment.packageHistory = packageHistory;

  if (packageHistory && packageHistory.length > 0) {
    deployment.package = packageHistory[packageHistory.length - 1];
  } else {
    deployment.package = null;
  }

  return true;
},

clearPackageHistory: (deploymentId) => {
  const deployment = deployments.find(d => d.id === deploymentId);
  if (!deployment) {
    throw new Error('Deployment not found');
  }

  deployment.packageHistory = [];
  deployment.package = null;

  return true;
},


  // ========================================================================
  // COLLABORATOR OPERATIONS
  // ========================================================================
  // Collaborators represent permission mappings between accounts and apps
  // Fields: email, accountId, appId, permission (Owner/Collaborator)
  // Purpose: Controls who can access/modify apps
  collaborators,
  addCollaborator: (collab) => {
    const exists = collaborators.find(c => 
      c.appId === collab.appId && c.email === collab.email
    );
    if (!exists) {
      collaborators.push(collab);
    }
    return !exists;
  },
  getCollaborators: (appId) => collaborators.filter(c => c.appId === appId),
  getCollaboratorForApp: (accountId, appId) => {
    return collaborators.find(c => c.accountId === accountId && c.appId === appId);
  },
  getCollaboratorsMap: (accountId, appId) => {
    // Get all collaborators for the app and format as CollaboratorMap
    const collabs = collaborators.filter(c => c.appId === appId);
    const collabMap = {};
    
    collabs.forEach(collab => {
      collabMap[collab.email] = {
        accountId: collab.accountId,
        permission: collab.permission,
        isCurrentAccount: collab.accountId === accountId
      };
    });
    
    return collabMap;
  },
  addCollaboratorToApp: (accountId, appId, email) => {
    // Check if collaborator already exists (case-insensitive)
    const exists = collaborators.find(c => 
      c.appId === appId && 
      (c.email === email || c.email.toLowerCase() === email.toLowerCase())
    );
    
    if (exists) {
      throw new Error('The given account is already a collaborator for this app.');
    }
    
    // Get account by email to ensure it exists and get the correct email casing
    const targetAccount = accounts.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
    if (!targetAccount) {
      throw new Error('The specified e-mail address doesn\'t represent a registered user');
    }
    
    // Use the email from the account (preserve casing)
    const actualEmail = targetAccount.email;
    
    // Add collaborator
    collaborators.push({
      email: actualEmail,
      accountId: targetAccount.id,
      appId: appId,
      permission: 'Collaborator'
    });
    
    return true;
  },
  removeCollaboratorFromApp: (accountId, appId, email) => {
    // Find the collaborator
    const collab = collaborators.find(c => 
      c.appId === appId && 
      (c.email === email || c.email.toLowerCase() === email.toLowerCase())
    );
    
    if (!collab) {
      throw new Error('The given email is not a collaborator for this app.');
    }
    
    // Cannot remove the owner
    if (collab.permission === 'Owner') {
      throw new Error('Cannot remove the owner of the app from collaborator list.');
    }
    
    // Remove the collaborator
    const index = collaborators.findIndex(c => 
      c.appId === appId && 
      (c.email === email || c.email.toLowerCase() === email.toLowerCase())
    );
    if (index !== -1) {
      collaborators.splice(index, 1);
    }
    
    return true;
  },
  updateCollaboratorRole: (accountId, appId, email, newPermission) => {
    // Find the collaborator (case-insensitive)
    const collab = collaborators.find(c => 
      c.appId === appId && 
      (c.email === email || c.email.toLowerCase() === email.toLowerCase())
    );
    
    if (!collab) {
      throw new Error('The given email is not a collaborator for this app.');
    }
    
    // Update permission
    collab.permission = newPermission;
    return collab;
  },

  // ========================================================================
  // TENANT/ORGANIZATION OPERATIONS
  // ========================================================================
  // Tenants represent organizations that can contain multiple apps
  // Fields: id, displayName, createdBy, createdAt
  // Relationships: apps can belong to tenants, tenant created by account
  tenants,
  addTenant: (tenant) => {
    const id = generateId('tenant');
    const newTenant = { ...tenant, id, createdAt: Date.now() };
    tenants.push(newTenant);
    return newTenant;
  },
  getTenant: (tenantId) => tenants.find(t => t.id === tenantId),
  getTenants: (accountId) => {
    // Get all tenants where user has access via apps (as collaborator/owner)
    // Find all apps where user is a collaborator
    const userApps = apps.filter(app => {
      const collab = collaborators.find(c => c.accountId === accountId && c.appId === app.id);
      return collab !== undefined && app.tenantId !== null;
    });

    // Get unique tenant IDs
    const tenantIds = [...new Set(userApps.map(app => app.tenantId).filter(Boolean))];

    // Get tenant details and determine role
    const tenantOrgs = tenantIds.map(tenantId => {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return null;

      // Role is "Owner" if user created the tenant, otherwise "Collaborator"
      const role = tenant.createdBy === accountId ? 'Owner' : 'Collaborator';

      return {
        id: tenant.id,
        displayName: tenant.displayName,
        role: role
      };
    }).filter(Boolean);

    return tenantOrgs;
  },
  removeTenant: (accountId, tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) {
      throw new Error('Specified Organisation does not exist.');
    }

    // Check if user is the owner (createdBy)
    if (tenant.createdBy !== accountId) {
      throw new Error('User does not have admin permissions for the specified tenant.');
    }

    // Get all apps under this tenant
    const tenantApps = apps.filter(app => app.tenantId === tenantId);

    // For each app:
    // - If app owner is the requesting user, delete the app
    // - If app owner is someone else, set tenantId to null
    tenantApps.forEach(app => {
      if (app.accountId === accountId) {
        // Delete app (and associated data)
        module.exports.deleteApp(accountId, app.id);
      } else {
        // Remove tenant association
        app.tenantId = null;
      }
    });

    // Delete the tenant
    const index = tenants.findIndex(t => t.id === tenantId);
    if (index !== -1) {
      tenants.splice(index, 1);
    }

    return true;
  },

  // ========================================================================
  // ACCESS KEY OPERATIONS
  // ========================================================================
  // Access keys are API authentication tokens
  // Fields: id, name (secret key), friendlyName (human-readable), accountId, expires, scope, isSession
  // Purpose: Allow programmatic access to API without user login
  accessKeys,
  addAccessKey: (accountId, accessKey) => {
    const id = generateId('accesskey');
    const newAccessKey = { ...accessKey, id, accountId };
    accessKeys.push(newAccessKey);
    return id;
  },
  getAccessKeys: (accountId) => {
    return accessKeys.filter(ak => ak.accountId === accountId);
  },
  getAccessKeyById: (accountId, accessKeyId) => {
    return accessKeys.find(ak => ak.id === accessKeyId && ak.accountId === accountId);
  },
  findAccessKeyByName: (accountId, name) => {
    // Match by either name or friendlyName
    return accessKeys.find(ak => 
      ak.accountId === accountId && 
      (ak.name === name || ak.friendlyName === name)
    );
  },
  updateAccessKey: (accountId, accessKey) => {
    const index = accessKeys.findIndex(ak => 
      ak.id === accessKey.id && ak.accountId === accountId
    );
    if (index !== -1) {
      accessKeys[index] = { ...accessKeys[index], ...accessKey };
      return true;
    }
    return false;
  },
  removeAccessKey: (accountId, accessKeyId) => {
    const index = accessKeys.findIndex(ak => 
      ak.id === accessKeyId && ak.accountId === accountId
    );
    if (index !== -1) {
      accessKeys.splice(index, 1);
      return true;
    }
    return false;
  },
  getUserFromAccessKey: (friendlyName) => {
    // Search by friendlyName
    const accessKey = accessKeys.find(ak => ak.friendlyName === friendlyName);
    if (!accessKey) {
      throw new Error('Access key not found');
    }
    
    // Check if expired
    if (new Date().getTime() >= accessKey.expires) {
      throw new Error('The access key has expired.');
    }
    
    // Get account
    const account = accounts.find(a => a.id === accessKey.accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    
    return account;
  },
  removeAccessKeysByCreatedBy: (accountId, createdBy) => {
    // Remove all access keys that are sessions and match createdBy
    const toRemove = accessKeys.filter(ak => 
      ak.accountId === accountId && 
      ak.isSession === true && 
      ak.createdBy === createdBy
    );
    
    toRemove.forEach(ak => {
      const index = accessKeys.findIndex(key => key.id === ak.id);
      if (index !== -1) {
        accessKeys.splice(index, 1);
      }
    });
    
    return toRemove.length;
  },

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================
  
  /**
   * Reset all data - clears all arrays
   * Useful for testing to start with a clean slate
   */
  reset: () => {
    accounts = [];
    apps = [];
    deployments = [];
    accessKeys = [];
    tenants = [];
    collaborators = [];
    accountIdCounter = 1;
    appIdCounter = 1;
    deploymentIdCounter = 1;
    deploymentKeyCounter = 1;
  },

  /**
   * Reset only releases (packageHistory) - keeps accounts, apps, and deployments
   * Useful for test isolation - clears releases between tests without losing setup data
   */
  resetReleases: () => {
    // Clear packageHistory for all deployments
    deployments.forEach(deployment => {
      deployment.packageHistory = [];
      deployment.package = null;
    });
    console.log('✅ Reset releases for all deployments');
  },

  /**
   * Initialize pre-configured test data
   * Creates default account, tenant, app, and deployment for testing
   * This data is automatically created when the server starts
   */
  initializePreconfiguredData: () => {
    // Reset any existing data first
    module.exports.reset();

    // 1. Load accounts from static data file
    const staticAccounts = loadStaticAccounts();
    if (staticAccounts.length > 0) {
      accounts.push(...staticAccounts);
    } else {
      // Fallback to programmatic creation if static file doesn't exist
      const testAccountId = 'test-user';
      const testAccount = {
        id: testAccountId,
        name: 'Test User',
        email: 'test@example.com',
        linkedProviders: []
      };
      accounts.push(testAccount);
    }

    // Get test account ID (from static data or fallback)
    const testAccountId = accounts.length > 0 ? accounts[0].id : 'test-user';
    const testAccount = accounts[0];

    // 1b. Create playwright test account
    const playwrightAccountId = 'test-user-playwright';
    const playwrightAccount = {
      id: playwrightAccountId,
      name: 'Playwright Test User',
      email: 'playwright@example.com',
      linkedProviders: []
    };
    accounts.push(playwrightAccount);

    // 2. Load tenants from static data file
    const staticTenants = loadStaticTenants();
    if (staticTenants.length > 0) {
      tenants.push(...staticTenants);
    } else {
      // Fallback to programmatic creation if static file doesn't exist
      // Create test tenant/organization
      // Note: displayName must match what CLI uses (testOrg/testApp format)
      const testTenantId = 'testOrg';
      const testTenant = {
        id: testTenantId,
        displayName: 'testOrg', // Must match CLI app name format
        createdBy: testAccountId,
        createdAt: Date.now()
      };
      tenants.push(testTenant);
    }

    // Get test tenant ID (from static data or fallback)
    const testTenantId = tenants.length > 0 ? tenants[0].id : 'testOrg';

    // 3. Load apps from static data file
    const staticApps = loadStaticApps();
    if (staticApps.length > 0) {
      apps.push(...staticApps);
    } else {
      // Fallback to programmatic creation if static file doesn't exist
      const testAppName = 'testApp';
      const testApp = {
        id: generateId('app'),
        name: testAppName,
        accountId: testAccountId,
        tenantId: testTenantId,
        createdTime: Date.now()
      };
      apps.push(testApp);
    }

    // Get test app (from static data or fallback)
    const testApp = apps[0];

    // 4. Load deployments from static data file
    const staticDeployments = loadStaticDeployments();
    if (staticDeployments.length > 0) {
      deployments.push(...staticDeployments);
    } else {
      // Fallback to programmatic creation if static file doesn't exist
      // Create Production deployment with the expected key
      const productionDeployment = {
        id: generateId('deployment'),
        name: 'Production',
        key: 'deployment-key-1',
        appId: testApp.id,
        createdTime: Date.now(),
        packageHistory: [],
        package: null
      };
      deployments.push(productionDeployment);

      // Create Staging deployment (optional, but useful for testing)
      const stagingDeployment = {
        id: generateId('deployment'),
        name: 'Staging',
        key: 'deployment-key-2',
        appId: testApp.id,
        createdTime: Date.now(),
        packageHistory: [],
        package: null
      };
      deployments.push(stagingDeployment);
    }

    // 7. Create playwright test org/app/deployments
    const playwrightTenantId = 'test-org-1';
    const playwrightTenant = {
      id: playwrightTenantId,
      displayName: 'test-org-1',
      createdBy: playwrightAccountId,
      createdAt: Date.now()
    };
    tenants.push(playwrightTenant);

    const playwrightAppName = 'TestApp';
    const playwrightApp = {
      id: generateId('app'),
      name: playwrightAppName,
      accountId: playwrightAccountId,
      tenantId: playwrightTenantId,
      createdTime: Date.now()
    };
    apps.push(playwrightApp);

    // Create deployments for playwright app
    const playwrightProdDeployment = {
      id: generateId('deployment'),
      name: 'Production',
      key: 'playwright-prod-key',
      appId: playwrightApp.id,
      createdTime: Date.now(),
      packageHistory: [],
      package: null
    };
    deployments.push(playwrightProdDeployment);

    const playwrightStagingDeployment = {
      id: generateId('deployment'),
      name: 'Staging',
      key: 'playwright-staging-key',
      appId: playwrightApp.id,
      createdTime: Date.now(),
      packageHistory: [],
      package: null
    };
    deployments.push(playwrightStagingDeployment);

    // Add playwright user as owner collaborator
    collaborators.push({
      email: playwrightAccount.email,
      accountId: playwrightAccountId,
      appId: playwrightApp.id,
      permission: 'Owner'
    });

    // 5. Load collaborators from static data file
    const staticCollaborators = loadStaticCollaborators();
    if (staticCollaborators.length > 0) {
      collaborators.push(...staticCollaborators);
    } else {
      // Fallback to programmatic creation if static file doesn't exist
      // Add test-user as owner collaborator for the app
      collaborators.push({
        email: testAccount.email,
        accountId: testAccountId,
        appId: testApp.id,
        permission: 'Owner'
      });
    }

    // 7. Load access keys from static data file
    const staticAccessKeys = loadStaticAccessKeys();
    if (staticAccessKeys.length > 0) {
      accessKeys.push(...staticAccessKeys);
    } else {
      // Fallback to programmatic creation if static file doesn't exist
      // Create access key for CLI authentication (named "test-user")
      // CLI sends "Bearer cli-test-user", so we need an access key with friendlyName "test-user"
      const accessKeyExpiry = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days from now
      const testAccessKey = {
        id: generateId('accesskey'),
        name: `cli-${testAccountId}`, // CLI uses this as the actual key
        friendlyName: testAccountId, // This is what CLI references
        accountId: testAccountId,
        expires: accessKeyExpiry,
        createdTime: Date.now(),
        isSession: false,
        createdBy: testAccountId,
        scope: null,
        description: testAccountId
      };
      accessKeys.push(testAccessKey);
    }

    // Pre-configured test data prepared
  }
};


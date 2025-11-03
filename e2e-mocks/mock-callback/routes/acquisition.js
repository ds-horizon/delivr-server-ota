const db = require('../mock_data');
const fs = require('fs');
const path = require('path');

// File-based logging function
function writeLog(message) {
  const logFile = '/tmp/update-check.log';
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

// Simple semver check (basic implementation)
function isValidSemver(version) {
  // Basic semver validation: major.minor.patch
  const semverRegex = /^\d+\.\d+\.\d+(-.+)?$/;
  return semverRegex.test(version);
}

// Simple semver satisfies check (basic implementation)
function semverSatisfies(appVersion, packageAppVersion) {
  // For mock, do simple equality or ">=" check
  // In real implementation, uses semver library
  if (appVersion === packageAppVersion) return true;
  
  // Basic range check: if package version is >= app version
  const appParts = appVersion.split('.');
  const pkgParts = packageAppVersion.split('.');
  
  for (let i = 0; i < 3; i++) {
    const app = parseInt(appParts[i] || '0');
    const pkg = parseInt(pkgParts[i] || '0');
    if (pkg > app) return true;
    if (pkg < app) return false;
  }
  
  return true; // Equal versions satisfy
}

// Check if rollout is unfinished
function isUnfinishedRollout(rollout) {
  return rollout !== null && rollout !== undefined && rollout > 0 && rollout < 100;
}

// GET /updateCheck - Check for available updates
function updateCheck(req, res) {
  const deploymentKey = req.query.deploymentKey || req.query.deployment_key;
  const appVersion = req.query.appVersion || req.query.app_version;
  const clientUniqueId = req.query.clientUniqueId || req.query.client_unique_id;
  const packageHash = req.query.packageHash || req.query.package_hash;
  const label = req.query.label;
  const isCompanion = req.query.isCompanion === 'true' || req.query.is_companion === 'true';
  const newApi = req.originalUrl.includes('v0.1/public/codepush/update_check') || req.path.includes('v0.1/public/codepush/update_check');
  
  // Log the update check request - use file logging as primary method
  const timestamp = new Date().toISOString();
  writeLog(`🔍 UPDATE CHECK Request received`);
  writeLog(`   URL: ${req.originalUrl || req.url}`);
  writeLog(`   Deployment Key: ${deploymentKey}`);
  writeLog(`   App Version: ${appVersion}`);
  writeLog(`   Package Hash: ${packageHash || '(none)'}`);
  writeLog(`   Label: ${label || '(none)'}`);
  writeLog(`   Client Unique ID: ${clientUniqueId || '(none)'}`);
  
  // Also try console methods
  console.error(`[UPDATE CHECK] ${timestamp} - ${deploymentKey} - ${appVersion}`);
  console.log(`[UPDATE CHECK] ${timestamp} - ${deploymentKey} - ${appVersion}`);

  // Validate required fields
  if (!deploymentKey) {
    return res.status(400).send(
      'An update check must include a valid deployment key - please check that your app has been ' +
      'configured correctly. To view available deployment keys, run \'code-push-standalone deployment ls <appName> -k\'.'
    );
  }

  if (!appVersion || !isValidSemver(appVersion)) {
    return res.status(400).send(
      'An update check must include a binary version that conforms to the semver standard (e.g. \'1.0.0\'). ' +
      'The binary version is normally inferred from the App Store/Play Store version configured with your app.'
    );
  }

  // Find deployment by key
  const deployment = db.getDeploymentByKey(deploymentKey);
  if (!deployment) {
    console.log(`   ❌ Deployment not found for key: ${deploymentKey}`);
    // Return no update if deployment not found
    const noUpdate = {
      updateInfo: {
        isAvailable: false,
        shouldRunBinaryVersion: true,
        appVersion: appVersion
      }
    };
    return res.status(200).send(newApi ? convertToSnakeCase(noUpdate) : noUpdate);
  }
  
  console.log(`   ✅ Deployment found: ${deployment.name} (appId: ${deployment.appId})`);

  // Get package history
  const packageHistory = db.getPackageHistory(deployment.id);
  
  console.log(`   📦 Package history: ${packageHistory ? packageHistory.length : 0} packages`);
  
  if (!packageHistory || packageHistory.length === 0) {
    console.log(`   ℹ️  No packages found - returning no update`);
    // No packages, return no update
    const noUpdate = {
      updateInfo: {
        isAvailable: false,
        shouldRunBinaryVersion: true,
        appVersion: appVersion
      }
    };
    return res.status(200).send(newApi ? convertToSnakeCase(noUpdate) : noUpdate);
  }

  // Find the latest enabled package that satisfies appVersion
  let latestEnabledPackage = null;
  let latestSatisfyingPackage = null;
  let foundCurrentPackage = false;
  let rollout = null;

  // Search from newest to oldest
  for (let i = packageHistory.length - 1; i >= 0; i--) {
    const pkg = packageHistory[i];
    
    // Check if this is the package the client is currently running
    if ((label && pkg.label === label) || 
        (!label && packageHash && pkg.packageHash === packageHash) ||
        (!label && !packageHash)) {
      foundCurrentPackage = true;
    }

    // Skip disabled packages
    if (pkg.isDisabled) {
      continue;
    }

    // Track latest enabled package
    if (!latestEnabledPackage) {
      latestEnabledPackage = pkg;
    }

    // Check if package satisfies appVersion (or ignore if isCompanion)
    if (isCompanion || semverSatisfies(appVersion, pkg.appVersion)) {
      // Skip unfinished rollout packages for satisfying check
      if (isUnfinishedRollout(pkg.rollout)) {
        rollout = pkg.rollout;
        continue;
      }
      
      if (!latestSatisfyingPackage) {
        latestSatisfyingPackage = pkg;
      }
    }
  }

  // Build response
  const updateInfo = {
    isAvailable: false,
    shouldRunBinaryVersion: false,
    appVersion: appVersion,
    downloadURL: '',
    packageSize: 0,
    label: '',
    packageHash: '',
    description: '',
    isMandatory: false,
    updateAppVersion: false,
    isBundlePatchingEnabled: false
  };

  // If no satisfying package found
  if (!latestSatisfyingPackage) {
    console.log(`   ℹ️  No package satisfies app version ${appVersion}`);
    updateInfo.shouldRunBinaryVersion = true;
    
    // Still provide appVersion info if latest enabled package exists
    if (latestEnabledPackage) {
      updateInfo.appVersion = latestEnabledPackage.appVersion;
      // If client version is newer than latest, suggest update
      if (!semverSatisfies(appVersion, latestEnabledPackage.appVersion)) {
        updateInfo.updateAppVersion = true;
        console.log(`   ⚠️  Client app version (${appVersion}) doesn't match latest package version (${latestEnabledPackage.appVersion})`);
      }
    }

    const response = { updateInfo: updateInfo };
    console.log(`   ✅ Response: No update available (shouldRunBinaryVersion=true)`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return res.status(200).send(newApi ? convertToSnakeCase(response) : response);
  }

  // If client already has this package, no update
  if (latestSatisfyingPackage.packageHash === packageHash ||
      (label && latestSatisfyingPackage.label === label)) {
    console.log(`   ✅ Client already has latest package (hash: ${latestSatisfyingPackage.packageHash}, label: ${latestSatisfyingPackage.label})`);
    console.log(`   ℹ️  Returning: No update available`);
    if (latestEnabledPackage) {
      updateInfo.appVersion = latestEnabledPackage.appVersion;
      if (!semverSatisfies(appVersion, latestEnabledPackage.appVersion)) {
        updateInfo.updateAppVersion = true;
      }
    }

    const response = { updateInfo: updateInfo };
    return res.status(200).send(newApi ? convertToSnakeCase(response) : response);
  }

  // Update is available
  console.log(`   🎉 UPDATE AVAILABLE!`);
  console.log(`   📥 Package: ${latestSatisfyingPackage.label} (hash: ${latestSatisfyingPackage.packageHash})`);
  console.log(`   📦 Size: ${latestSatisfyingPackage.size} bytes`);
  console.log(`   🔗 Download URL: ${latestSatisfyingPackage.blobUrl}`);
  console.log(`   📝 Description: ${latestSatisfyingPackage.description || '(none)'}`);
  console.log(`   ⚠️  Mandatory: ${latestSatisfyingPackage.isMandatory}`);
  
  updateInfo.isAvailable = true;
  updateInfo.downloadURL = latestSatisfyingPackage.blobUrl || '';
  updateInfo.packageSize = latestSatisfyingPackage.size || 0;
  updateInfo.label = latestSatisfyingPackage.label || '';
  updateInfo.packageHash = latestSatisfyingPackage.packageHash || '';
  updateInfo.description = latestSatisfyingPackage.description || '';
  updateInfo.isMandatory = latestSatisfyingPackage.isMandatory || false;
  updateInfo.appVersion = latestSatisfyingPackage.appVersion;
  updateInfo.isBundlePatchingEnabled = latestSatisfyingPackage.isBundlePatchingEnabled || false;

  // Handle rollout package selection (simplified)
  let finalUpdateInfo = updateInfo;
  if (rollout && clientUniqueId) {
    // Simplified rollout selection: use clientUniqueId hash
    const hash = simpleHash(clientUniqueId);
    const shouldUseRollout = (hash % 100) < rollout;
    
    if (shouldUseRollout) {
      // Find rollout package
      const rolloutPackage = packageHistory[packageHistory.length - 1];
      if (rolloutPackage && isUnfinishedRollout(rolloutPackage.rollout)) {
        finalUpdateInfo = {
          ...updateInfo,
          downloadURL: rolloutPackage.blobUrl || '',
          packageSize: rolloutPackage.size || 0,
          label: rolloutPackage.label || '',
          packageHash: rolloutPackage.packageHash || '',
          description: rolloutPackage.description || '',
          isMandatory: rolloutPackage.isMandatory || false,
          appVersion: rolloutPackage.appVersion
        };
      }
    }
  }

  finalUpdateInfo.target_binary_range = finalUpdateInfo.appVersion;

  const response = { updateInfo: finalUpdateInfo };
  console.log(`   ✅ Response: isAvailable=${finalUpdateInfo.isAvailable}, label=${finalUpdateInfo.label}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  return res.status(200).send(newApi ? convertToSnakeCase(response) : response);
}

// Simple hash function for rollout selection
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Convert camelCase to snake_case
function convertToSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToSnakeCase(item));
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = convertToSnakeCase(obj[key]);
    }
  }
  return result;
}

// POST /reportStatus/deploy - Report deployment status
function reportStatusDeploy(req, res) {
  const deploymentKey = req.body.deploymentKey || req.body.deployment_key;
  const appVersion = req.body.appVersion || req.body.app_version;
  const label = req.body.label;
  const status = req.body.status;
  const clientUniqueId = req.body.clientUniqueId || req.body.client_unique_id;

  // Validate required fields
  if (!deploymentKey || !appVersion) {
    return res.status(400).send(
      'A deploy status report must contain a valid appVersion and deploymentKey.'
    );
  }

  // If label is provided, status must also be provided and valid
  if (label) {
    if (!status) {
      return res.status(400).send(
        'A deploy status report for a labelled package must contain a valid status.'
      );
    }
    
    const validStatuses = ['DeploymentSucceeded', 'DeploymentFailed', 'Downloaded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send('Invalid status: ' + status);
    }
  }

  // For older SDK versions, clientUniqueId is required
  // For newer versions (1.5.2-beta+), it's optional
  // For mock, we'll accept requests without clientUniqueId if they have label/status
  // This matches the behavior where newer SDK versions don't require clientUniqueId

  // In the real implementation, this updates Redis with metrics
  // For mock, we just log and return success
  console.log(`[MOCK] Deploy status report: deploymentKey=${deploymentKey}, appVersion=${appVersion}, label=${label}, status=${status}, clientUniqueId=${clientUniqueId}`);
  
  return res.sendStatus(200);
}

// POST /reportStatus/download - Report download status
function reportStatusDownload(req, res) {
  const deploymentKey = req.body.deploymentKey || req.body.deployment_key;
  const label = req.body.label;

  // Validate required fields
  if (!req.body || !deploymentKey || !label) {
    return res.status(400).send(
      'A download status report must contain a valid deploymentKey and package label.'
    );
  }

  // In the real implementation, this increments download count in Redis
  // For mock, we just log and return success
  console.log(`[MOCK] Download status report: deploymentKey=${deploymentKey}, label=${label}`);
  
  return res.sendStatus(200);
}

// GET /healthcheck - Health check endpoint
function healthcheck(req, res) {
  // In the real implementation, this checks Storage, Redis, and Memcached
  // For mock, we just return healthy
  return res.status(200).send('Healthy');
}

module.exports = {
  updateCheck,
  reportStatusDeploy,
  reportStatusDownload,
  healthcheck
};


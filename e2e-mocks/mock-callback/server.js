const express = require('express');
const bodyParser = require('body-parser');
const accountRoutes = require('./routes/account');
const appsRoutes = require('./routes/apps');
const tenantsRoutes = require('./routes/tenants');
const collaboratorsRoutes = require('./routes/collaborators');
const deploymentsRoutes = require('./routes/deployments');
const releasesRoutes = require('./routes/releases');
const accessKeysRoutes = require('./routes/accesskeys');
const authenticationRoutes = require('./routes/authentication');
const acquisitionRoutes = require('./routes/acquisition');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Authentication routes
app.get('/authenticated', authenticationRoutes.getAuthenticated);

// Acquisition routes (public, no auth)
app.get('/updateCheck', acquisitionRoutes.updateCheck);
app.get('/v0.1/public/codepush/update_check', acquisitionRoutes.updateCheck);

// Account routes
app.get('/account', accountRoutes.getAccount);
app.post('/account', accountRoutes.postAccount);

// Apps routes
app.get('/apps', appsRoutes.getApps);
app.post('/apps', appsRoutes.postApps);
app.get('/apps/:appName', appsRoutes.getApp);
app.patch('/apps/:appName', appsRoutes.patchApp);
app.delete('/apps/:appName', appsRoutes.deleteApp);

// Tenants routes
app.get('/tenants', tenantsRoutes.getTenants);
app.delete('/tenants/:tenantId', tenantsRoutes.deleteTenant);

// Collaborators routes
app.get('/apps/:appName/collaborators', collaboratorsRoutes.getCollaborators);
app.post('/apps/:appName/collaborators/:email', collaboratorsRoutes.postCollaborator);
app.patch('/apps/:appName/collaborators/:email', collaboratorsRoutes.patchCollaborator);
app.delete('/apps/:appName/collaborators/:email', collaboratorsRoutes.deleteCollaborator);

// Deployments routes
app.get('/apps/:appName/deployments', deploymentsRoutes.getDeployments);
app.post('/apps/:appName/deployments', deploymentsRoutes.postDeployment);
app.get('/apps/:appName/deployments/:deploymentName', deploymentsRoutes.getDeployment);
app.patch('/apps/:appName/deployments/:deploymentName', deploymentsRoutes.patchDeployment);
app.delete('/apps/:appName/deployments/:deploymentName', deploymentsRoutes.deleteDeployment);

// Releases routes
app.get('/apps/:appName/deployments/:deploymentName/history', releasesRoutes.getHistory);
app.post('/apps/:appName/deployments/:deploymentName/release', releasesRoutes.postRelease);
app.patch('/apps/:appName/deployments/:deploymentName/release', releasesRoutes.patchRelease);
app.delete('/apps/:appName/deployments/:deploymentName/history', releasesRoutes.deleteHistory);

// Access Keys routes
app.get('/accessKeys', accessKeysRoutes.getAccessKeys);
app.post('/accessKeys', accessKeysRoutes.postAccessKeys);
app.get('/accessKeys/:accessKeyName', accessKeysRoutes.getAccessKey);
app.patch('/accessKeys/:accessKeyName', accessKeysRoutes.patchAccessKey);
app.delete('/accessKeys/:accessKeyName', accessKeysRoutes.deleteAccessKey);
app.delete('/sessions/:createdBy', accessKeysRoutes.deleteSessions);
app.get('/accountByaccessKeyName', accessKeysRoutes.getAccountByAccessKeyName);

// Default 404
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Not handled' });
});

app.listen(PORT, () => {
  console.log(`Mock callback service running on port ${PORT}`);
});

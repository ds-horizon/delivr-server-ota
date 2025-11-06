const db = require('../mock_data');
const { json, html, fieldErr, sendError } = require('../utils/response');

const { getUserId } = require('../utils/auth');

// GET /tenants - Get all tenants/organizations for account
function getTenants(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const account = db.getAccount(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const organisations = db.getTenants(accountId);

  return res.status(200).json({ organisations });
}

// DELETE /tenants/:tenantId - Delete a tenant/organization
// Tenants are always static - validates all scenarios but doesn't delete
function deleteTenant(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }

  // Validate tenant exists and user has permissions (matches real implementation behavior)
  const tenant = db.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Specified Organisation does not exist.' });
  }

  // Check if user is the owner (createdBy)
  if (tenant.createdBy !== accountId) {
    return res.status(403).json({ error: 'User does not have admin permissions for the specified tenant.' });
  }

  // Tenants are static - validate all scenarios but don't delete
  // Return success response as if tenant was deleted (matches real implementation)
  return res.status(201).send('Org deleted successfully');
}

module.exports = {
  getTenants,
  deleteTenant
};


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
function deleteTenant(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }

  try {
    db.removeTenant(accountId, tenantId);
    return res.status(201).send('Org deleted successfully');
  } catch (error) {
    if (error.message === 'Specified Organisation does not exist.') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'User does not have admin permissions for the specified tenant.') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getTenants,
  deleteTenant
};


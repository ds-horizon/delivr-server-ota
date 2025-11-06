const db = require('../mock_data');
const { json, html, fieldErr } = require('../utils/response');

const { getUserId } = require('../utils/auth');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /account
function getAccount(req, res) {
  const accountId = getUserId(req);
  if (!accountId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const account = db.getAccount(accountId);
  if (!account) {
    return res.status(404).send('Account not found');
  }

  return res.status(200).json({ account });
}

// POST /account
// Accounts are always static - validates all scenarios but doesn't save
// Matches real implementation: creates new account with generated ID (not from auth token)
function postAccount(req, res) {
  // Validate request body first
  if (!req.body || !req.body.account) {
    return res.status(400).send(JSON.stringify([{ field: 'account', message: 'Required field missing' }]));
  }

  const acc = req.body.account;

  // Validate name field (required in real implementation)
  if (!acc.name || !acc.name.trim()) {
    return res.status(400).send(JSON.stringify([{ field: 'name', message: 'Required field missing' }]));
  }

  // Validate email format if provided
  if (acc.email && !isValidEmail(acc.email)) {
    return res.status(400).send(JSON.stringify([{ field: 'email', message: 'Invalid email format' }]));
  }

  // Check for duplicate email in static accounts (matches real implementation behavior)
  // Real implementation checks for duplicate email and returns AlreadyExists error
  const email = acc.email ? acc.email.toLowerCase() : null;
  const emailExists = email && db.accounts.some(a => a.email && a.email.toLowerCase() === email);

  if (emailExists) {
    return res.status(409).send('The provided resource already exists');
  }

  // Accounts are static - validate all scenarios but don't save
  // Generate a mock account ID (matching real implementation which generates ID)
  // In real implementation: account.id = shortid.generate()
  const mockAccountId = `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Return success response as if account was created (matches real implementation)
  return res.status(200).json({ account: mockAccountId });
}

module.exports = {
  getAccount,
  postAccount
};


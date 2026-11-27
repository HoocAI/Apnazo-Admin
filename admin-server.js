const http = require('http');
const fs = require('fs');
const path = require('path');

const ADMIN_PORT = process.env.ADMIN_PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const LEADS_CSV = path.join(DATA_DIR, 'leads.csv');
const SELLERS_FILE = path.join(DATA_DIR, 'sellers.json');
const AGREEMENT_FILE = path.join(DATA_DIR, 'agreement.json');

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8') || '{}');
    }
  } catch (err) {}
  return {
    support: {
      supportPhone: "+91 7355315892",
      sellerHelpline: "+91 7355315892",
      whatsappNumber: "+91 7355315892",
      supportEmail: "support@apnazo.com",
      grievanceEmail: "admin@apnazo.com",
      officeAddress: "Main Road, Rourkela, Sundargarh, Odisha - 769001",
      operatingHours: "9:00 AM – 9:00 PM (Monday to Sunday)"
    },
    forms: {
      sellerOnboardingActive: true,
      waitlistActive: true,
      maxCategoriesAllowed: 10,
      fssaiGraceDays: 15,
      notificationEmail: "admin@apnazo.com"
    },
    privacy: {
      title: "Apnazo Partner & User Privacy Policy",
      effectiveDate: "Effective Date: November 27, 2026 · Operating in Rourkela, Odisha",
      contentHtml: ""
    },
    terms: {
      title: "Apnazo Merchant & Partner Terms of Service",
      version: "Version 1.2 · Effective Date: November 27, 2026",
      contentHtml: ""
    }
  };
}

function saveSettings(data) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}


// Dedicated Admin Credentials
const ADMIN_USER = process.env.ADMIN_USER || 'admin@apnazo.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'ApnazoAdmin@2026';
const ADMIN_SESSION_TOKEN = 'apnazo_secure_session_token_2026_x7k';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(LEADS_FILE)) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(LEADS_CSV)) {
  fs.writeFileSync(LEADS_CSV, 'ID,Date,Time,Contact,Form_Source,User_Agent\n', 'utf8');
}
if (!fs.existsSync(SELLERS_FILE)) {
  fs.writeFileSync(SELLERS_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(AGREEMENT_FILE)) {
  const defaultAgreement = {
    title: "Terms & e-Sign Agreement",
    version: "1.2",
    updatedAt: new Date().toISOString(),
    summaryHeading: "Key Commercial Terms:",
    terms: [
      "Platform Commission: Standard 5% – 10% (0% promotional commission for first 30 days).",
      "Payout Settlement: T+2 days automated direct credit to verified bank account.",
      "Customer Returns: Standard 24-hour return & replacement policy for groceries and damaged goods.",
      "Zero hidden fees: No signup fees, no device rentals, and no monthly maintenance charges."
    ],
    fullAgreementText: "APNAZO SUPER APP MERCHANT & PARTNER AGREEMENT\n\n1. SCOPE AND ELIGIBILITY\nThis Partner Agreement governs the onboarding and commercial operations of merchants, drivers, and service professionals on the Apnazo Super App operating in Rourkela, Odisha. By completing OTP e-sign, the Partner agrees to fulfill customer orders with high quality and honest pricing.\n\n2. COMMISSIONS & PAYOUTS\n- Commission rates are capped as specified in your category schedule (5% to 10%).\n- All net earnings after platform commission and applicable statutory deductions (TDS/TCS) are credited on a T+2 business day rolling schedule directly to the verified bank account.\n\n3. CANCELLATION & DISPUTE RESOLUTION\nOrders cancelled by the seller without valid inventory justification may be subject to review. Disputes are handled via Apnazo Partner Helpdesk within 24 hours.\n\n4. COMPLIANCE & SAFETY\nPartners in food/grocery must maintain valid FSSAI licences. Drivers must maintain valid commercial licences and insurance as per Motor Vehicles Act.",
    consentCheckboxLabel: "I accept the Apnazo Partner Terms and e-Sign this agreement."
  };
  fs.writeFileSync(AGREEMENT_FILE, JSON.stringify(defaultAgreement, null, 2), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8') || '[]');
  } catch (err) {
    return [];
  }
}

function readSellers() {
  try {
    return JSON.parse(fs.readFileSync(SELLERS_FILE, 'utf8') || '[]');
  } catch (err) {
    return [];
  }
}

function saveSellers(sellers) {
  fs.writeFileSync(SELLERS_FILE, JSON.stringify(sellers, null, 2), 'utf8');
}

function readAgreement() {
  try {
    return JSON.parse(fs.readFileSync(AGREEMENT_FILE, 'utf8') || '{}');
  } catch (err) {
    return {};
  }
}

function saveAgreement(data) {
  fs.writeFileSync(AGREEMENT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function isAuthenticated(req) {
  const cookieHeader = req.headers['cookie'] || '';
  const authHeader = req.headers['authorization'] || '';

  if (cookieHeader.includes(`apnazo_admin_session=${ADMIN_SESSION_TOKEN}`)) {
    return true;
  }
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === ADMIN_SESSION_TOKEN) {
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  const jsonResponse = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // API: Admin Login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const username = (data.username || '').trim();
        const password = (data.password || '').trim();

        if ((username === ADMIN_USER || username === 'admin') && password === ADMIN_PASS) {
          res.setHeader('Set-Cookie', `apnazo_admin_session=${ADMIN_SESSION_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
          return jsonResponse(200, {
            success: true,
            token: ADMIN_SESSION_TOKEN,
            message: 'Authentication successful.'
          });
        } else {
          return jsonResponse(401, {
            success: false,
            error: 'Invalid Admin ID or Password.'
          });
        }
      } catch (e) {
        return jsonResponse(400, { success: false, error: 'Invalid JSON payload.' });
      }
    });
    return;
  }

  // API: Admin Logout
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', `apnazo_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    return jsonResponse(200, { success: true, message: 'Logged out successfully.' });
  }

  // API: List all sellers (Protected)
  if (pathname === '/api/admin/sellers' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized: Admin authentication required.' });
    }
    const sellers = readSellers();
    return jsonResponse(200, { success: true, count: sellers.length, sellers });
  }

  // API: Admin Decision on seller application (Protected)
  if (pathname === '/api/admin/seller/decision' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized: Admin authentication required.' });
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const { id, decision, tier, reason, actor } = data;
        if (!id || !decision) {
          return jsonResponse(400, { success: false, error: 'id and decision are required.' });
        }

        const sellers = readSellers();
        const sellerIndex = sellers.findIndex(s => s.id === id);
        if (sellerIndex === -1) {
          return jsonResponse(404, { success: false, error: 'Seller not found.' });
        }

        const now = new Date().toISOString();
        const seller = sellers[sellerIndex];
        seller.decision = decision;
        if (tier) seller.tier = tier;
        if (decision === 'GREEN') seller.status = 'Active';
        else if (decision === 'AMBER') seller.status = 'Needs Action';
        else if (decision === 'RED') seller.status = 'Rejected';

        seller.updatedAt = now;
        seller.auditLog = seller.auditLog || [];
        seller.auditLog.push({
          timestamp: now,
          actor: actor || 'Admin Reviewer',
          decision,
          reason: reason || 'Decision updated via Admin Command Center.'
        });

        saveSellers(sellers);
        console.log(`[Admin Decision] Seller ${id} set to ${decision}`);
        return jsonResponse(200, { success: true, seller });
      } catch (e) {
        return jsonResponse(400, { success: false, error: 'Invalid decision payload.' });
      }
    });
    return;
  }

  // API: Get Agreement (for editor)
  if ((pathname === '/api/admin/agreement' || pathname === '/api/agreement') && req.method === 'GET') {
    const agreement = readAgreement();
    return jsonResponse(200, { success: true, agreement });
  }

  // API: Update Agreement (Protected)
  if (pathname === '/api/admin/agreement' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized: Admin authentication required.' });
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const existing = readAgreement();

        const updated = {
          ...existing,
          title: (data.title || existing.title || 'Terms & e-Sign Agreement').trim(),
          version: (data.version || existing.version || '1.0').trim(),
          summaryHeading: (data.summaryHeading || existing.summaryHeading || 'Key Terms:').trim(),
          terms: Array.isArray(data.terms) ? data.terms : existing.terms,
          fullAgreementText: (data.fullAgreementText || existing.fullAgreementText || '').trim(),
          consentCheckboxLabel: (data.consentCheckboxLabel || existing.consentCheckboxLabel || '').trim(),
          updatedAt: new Date().toISOString()
        };

        saveAgreement(updated);
        console.log(`[Admin Agreement Updated] Version ${updated.version} published`);
        return jsonResponse(200, { success: true, agreement: updated });
      } catch (e) {
        return jsonResponse(400, { success: false, error: 'Invalid agreement payload.' });
      }
    });
    return;
  }

  // API: Export sellers as CSV (Protected)
  if (pathname === '/api/admin/sellers/export.csv' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Unauthorized: Admin login required.');
      return;
    }
    const sellers = readSellers();
    const csvHeader = 'Seller_ID,Business_Name,Owner_Name,Mobile,Verticals,Category,Tier,Decision,Status,PAN_Name,Bank_Beneficiary,Bank_Match_Score,Created_Date\n';
    const csvRows = sellers.map(s => {
      const b = s.basics || {};
      const clean = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        clean(s.id),
        clean(b.bizName),
        clean(b.ownerName),
        clean(s.mobile),
        clean((s.verticals || []).join('; ')),
        clean(b.category),
        clean(s.tier),
        clean(s.decision),
        clean(s.status),
        clean(s.pan?.registeredName),
        clean(s.bank?.beneficiaryName),
        clean(s.bank?.nameMatchScore ?? ''),
        clean(s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '')
      ].join(',');
    }).join('\n');

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="apnazo_sellers.csv"'
    });
    res.end(csvHeader + csvRows);
    return;
  }

  // API: Get Leads (Protected)
  if (pathname === '/api/leads' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized' });
    }
    const leads = readLeads();
    return jsonResponse(200, { success: true, count: leads.length, leads });
  }

  // API: Export leads CSV (Protected)
  if (pathname === '/api/leads/export.csv' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Unauthorized');
      return;
    }
    if (fs.existsSync(LEADS_CSV)) {
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="apnazo_leads.csv"'
      });
      fs.createReadStream(LEADS_CSV).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No CSV data available yet.');
    }
    return;
  }


  // API: Get Platform Settings (Public)
  if ((pathname === '/api/settings' || pathname === '/api/admin/settings') && req.method === 'GET') {
    return jsonResponse(200, { success: true, settings: readSettings() });
  }

  // API: Update Platform Settings (Protected)
  if (pathname === '/api/admin/settings' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized: Admin authentication required.' });
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const current = readSettings();
        if (data.support) current.support = { ...current.support, ...data.support };
        if (data.forms) current.forms = { ...current.forms, ...data.forms };
        current.updatedAt = new Date().toISOString();
        saveSettings(current);
        console.log('[Admin Settings] Platform settings updated');
        return jsonResponse(200, { success: true, settings: current });
      } catch (e) {
        return jsonResponse(400, { success: false, error: 'Invalid settings JSON payload.' });
      }
    });
    return;
  }

  // API: Get Privacy Policy Content (Public)
  if ((pathname === '/api/content/privacy' || pathname === '/api/admin/content/privacy') && req.method === 'GET') {
    return jsonResponse(200, { success: true, privacy: readSettings().privacy });
  }

  // API: Update Privacy Policy Content (Protected)
  if (pathname === '/api/admin/content/privacy' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized: Admin authentication required.' });
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const current = readSettings();
        current.privacy = {
          title: (data.title || current.privacy?.title || 'Apnazo Privacy Policy').trim(),
          effectiveDate: (data.effectiveDate || current.privacy?.effectiveDate || '').trim(),
          contentHtml: data.contentHtml || current.privacy?.contentHtml || '',
          updatedAt: new Date().toISOString()
        };
        saveSettings(current);
        console.log('[Admin Content] Privacy policy updated');
        return jsonResponse(200, { success: true, privacy: current.privacy });
      } catch (e) {
        return jsonResponse(400, { success: false, error: 'Invalid privacy payload.' });
      }
    });
    return;
  }

  // API: Get Terms of Service Content (Public)
  if ((pathname === '/api/content/terms' || pathname === '/api/admin/content/terms') && req.method === 'GET') {
    return jsonResponse(200, { success: true, terms: readSettings().terms });
  }

  // API: Update Terms of Service Content (Protected)
  if (pathname === '/api/admin/content/terms' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      return jsonResponse(401, { success: false, error: 'Unauthorized: Admin authentication required.' });
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const current = readSettings();
        current.terms = {
          title: (data.title || current.terms?.title || 'Apnazo Terms of Service').trim(),
          version: (data.version || current.terms?.version || '').trim(),
          contentHtml: data.contentHtml || current.terms?.contentHtml || '',
          updatedAt: new Date().toISOString()
        };
        saveSettings(current);
        console.log('[Admin Content] Terms of service updated');
        return jsonResponse(200, { success: true, terms: current.terms });
      } catch (e) {
        return jsonResponse(400, { success: false, error: 'Invalid terms payload.' });
      }
    });
    return;
  }

  // Serve Admin UI on root or /admin
  if (pathname === '/' || pathname === '/admin' || pathname === '/admin.html') {
    const adminHtmlPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminHtmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(adminHtmlPath).pipe(res);
      return;
    }
  }

  // Fallback for static assets in Admin
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p><a href="/">Return to Apnazo Admin Portal</a></p>');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(ADMIN_PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  Apnazo Dedicated Admin Portal Server`);
  console.log(`  - Running on Port: ${ADMIN_PORT}`);
  console.log(`  - URL:             http://localhost:${ADMIN_PORT}`);
  console.log(`  - Authentication:  admin@apnazo.com / ApnazoAdmin@2026`);
  console.log(`========================================\n`);
});

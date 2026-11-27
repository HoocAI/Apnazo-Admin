const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://developerhoocai_db_user:LKceBXsQtnzRje1F@dev-db.vqbk2xw.mongodb.net/apnazo_dev?retryWrites=true&w=majority";
const DB_NAME = process.env.DB_NAME || "apnazo_dev";

let client = null;
let db = null;
let isConnected = false;

async function getDB() {
  if (db && isConnected) return db;
  try {
    if (!client) {
      client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
    }
    await client.connect();
    db = client.db(DB_NAME);
    isConnected = true;
    console.log(`[MongoDB Atlas] Connected to database: ${DB_NAME}`);
    return db;
  } catch (err) {
    console.warn(`[MongoDB Warning] Atlas connection error (${err.message}). Using local JSON fallback.`);
    isConnected = false;
    return null;
  }
}

// ==================== USERS & SELLERS ====================

async function getSellers(fallbackPath) {
  try {
    const database = await getDB();
    if (database) {
      const sellers = await database.collection('sellers').find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
      if (sellers && sellers.length > 0) {
        return sellers.map(s => { delete s._id; return s; });
      }
    }
  } catch (e) {
    console.warn('[MongoDB getSellers Error]', e.message);
  }
  // Local file fallback
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try { return JSON.parse(fs.readFileSync(fallbackPath, 'utf8') || '[]'); } catch(e){}
  }
  return [];
}

async function saveSeller(sellerData, fallbackPath) {
  const s_id = sellerData.id;
  const mobile = sellerData.mobile;
  const now = new Date().toISOString();

  sellerData.updatedAt = now;
  if (!sellerData.createdAt) sellerData.createdAt = now;

  // 1. Save to MongoDB Atlas
  try {
    const database = await getDB();
    if (database) {
      // Upsert in sellers collection
      await database.collection('sellers').replaceOne({ id: s_id }, sellerData, { upsert: true });

      // Upsert corresponding user in users collection
      if (mobile) {
        const userDoc = {
          userId: `USR-${mobile}`,
          mobile: mobile,
          name: sellerData.basics?.ownerName || sellerData.basics?.bizName || '',
          role: 'partner',
          status: sellerData.status || 'Active',
          sellerId: s_id,
          category: sellerData.basics?.category || 'Retail',
          updatedAt: now
        };
        await database.collection('users').updateOne(
          { mobile: mobile },
          { $set: userDoc, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
      }
      console.log(`[MongoDB Atlas] Saved seller ${s_id} (Mobile: ${mobile}) to apnazo_dev`);
    }
  } catch (e) {
    console.warn('[MongoDB saveSeller Error]', e.message);
  }

  // 2. Sync to local JSON fallback
  if (fallbackPath) {
    try {
      let sellers = [];
      if (fs.existsSync(fallbackPath)) {
        sellers = JSON.parse(fs.readFileSync(fallbackPath, 'utf8') || '[]');
      }
      const idx = sellers.findIndex(s => s.id === s_id);
      if (idx !== -1) {
        sellers[idx] = sellerData;
      } else {
        sellers.unshift(sellerData);
      }
      fs.writeFileSync(fallbackPath, JSON.stringify(sellers, null, 2), 'utf8');
    } catch(e){}
  }

  return sellerData;
}

async function updateSellerDecision(id, decision, tier, reason, actor, fallbackPath) {
  const now = new Date().toISOString();
  let status = 'Pending Review';
  if (decision === 'GREEN') status = 'Active';
  else if (decision === 'AMBER') status = 'Needs Action';
  else if (decision === 'RED') status = 'Rejected';

  const auditEntry = {
    timestamp: now,
    actor: actor || 'Admin Reviewer',
    decision,
    reason: reason || 'Decision updated via Admin Command Center.'
  };

  try {
    const database = await getDB();
    if (database) {
      await database.collection('sellers').updateOne(
        { id: id },
        {
          $set: { decision, tier, status, updatedAt: now },
          $push: { auditLog: auditEntry }
        }
      );
      console.log(`[MongoDB Atlas] Updated seller decision ${id} -> ${decision}`);
    }
  } catch(e) {
    console.warn('[MongoDB updateSellerDecision Error]', e.message);
  }

  // Sync fallback
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try {
      const sellers = JSON.parse(fs.readFileSync(fallbackPath, 'utf8') || '[]');
      const s = sellers.find(item => item.id === id);
      if (s) {
        s.decision = decision;
        if (tier) s.tier = tier;
        s.status = status;
        s.updatedAt = now;
        s.auditLog = s.auditLog || [];
        s.auditLog.push(auditEntry);
        fs.writeFileSync(fallbackPath, JSON.stringify(sellers, null, 2), 'utf8');
      }
    } catch(e){}
  }
}

// ==================== LEADS ====================

async function getLeads(fallbackPath) {
  try {
    const database = await getDB();
    if (database) {
      const leads = await database.collection('leads').find({}).sort({ createdAt: -1 }).toArray();
      if (leads && leads.length > 0) {
        return leads.map(l => { delete l._id; return l; });
      }
    }
  } catch(e){}
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try { return JSON.parse(fs.readFileSync(fallbackPath, 'utf8') || '[]'); } catch(e){}
  }
  return [];
}

async function saveLead(leadData, fallbackPath, csvPath) {
  try {
    const database = await getDB();
    if (database) {
      await database.collection('leads').insertOne({ ...leadData });
    }
  } catch(e){}

  if (fallbackPath) {
    try {
      let leads = [];
      if (fs.existsSync(fallbackPath)) {
        leads = JSON.parse(fs.readFileSync(fallbackPath, 'utf8') || '[]');
      }
      leads.unshift(leadData);
      fs.writeFileSync(fallbackPath, JSON.stringify(leads, null, 2), 'utf8');
    } catch(e){}
  }
  if (csvPath) {
    try {
      const row = `${leadData.id},${leadData.date},${leadData.time},"${leadData.contact}",${leadData.source},"${(leadData.userAgent||'').replace(/"/g, '""')}"\n`;
      fs.appendFileSync(csvPath, row, 'utf8');
    } catch(e){}
  }
}

// ==================== SETTINGS & CONTENT ====================

async function getSettings(fallbackPath) {
  try {
    const database = await getDB();
    if (database) {
      const doc = await database.collection('settings').findOne({ key: 'platform_config' });
      if (doc) {
        // Also fetch legal content
        const priv = await database.collection('legal_content').findOne({ type: 'privacy' });
        const terms = await database.collection('legal_content').findOne({ type: 'terms' });
        return {
          support: doc.support || {},
          forms: doc.forms || {},
          privacy: priv || {},
          terms: terms || {}
        };
      }
    }
  } catch(e){}
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try { return JSON.parse(fs.readFileSync(fallbackPath, 'utf8') || '{}'); } catch(e){}
  }
  return {};
}

async function saveSettings(settingsData, fallbackPath) {
  const now = new Date().toISOString();
  try {
    const database = await getDB();
    if (database) {
      await database.collection('settings').updateOne(
        { key: 'platform_config' },
        {
          $set: {
            key: 'platform_config',
            support: settingsData.support || {},
            forms: settingsData.forms || {},
            updatedAt: now
          }
        },
        { upsert: true }
      );
      if (settingsData.privacy) {
        await database.collection('legal_content').updateOne(
          { type: 'privacy' },
          { $set: { ...settingsData.privacy, type: 'privacy', updatedAt: now } },
          { upsert: true }
        );
      }
      if (settingsData.terms) {
        await database.collection('legal_content').updateOne(
          { type: 'terms' },
          { $set: { ...settingsData.terms, type: 'terms', updatedAt: now } },
          { upsert: true }
        );
      }
    }
  } catch(e){}

  if (fallbackPath) {
    try {
      fs.writeFileSync(fallbackPath, JSON.stringify(settingsData, null, 2), 'utf8');
    } catch(e){}
  }
}

// Connect proactively
getDB().catch(()=>{});

module.exports = {
  getDB,
  getSellers,
  saveSeller,
  updateSellerDecision,
  getLeads,
  saveLead,
  getSettings,
  saveSettings
};

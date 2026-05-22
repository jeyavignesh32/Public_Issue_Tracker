require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// DB Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── JWT Auth Middleware ────────────────────────────────────────────────────
function auth(roles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  const allowedRoles = ['user', 'worker'];
  const userRole = allowedRoles.includes(role) ? role : 'user';
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?,?,?,?,?)',
      [name, email, hash, phone || null, userRole]
    );
    const token = jwt.sign({ id: result.insertId, name, email, role: userRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.insertId, name, email, role: userRole } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC COMPLAINTS (no auth needed)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/complaints/public — all complaints visible to public
app.get('/api/complaints/public', async (req, res) => {
  const { type, status, search, page = 1, limit = 20 } = req.query;
  let query = `
    SELECT c.*, u.name AS reporter_name,
      (SELECT COUNT(*) FROM upvotes WHERE complaint_id = c.id) AS upvote_count
    FROM complaints c
    JOIN users u ON c.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (type) { query += ' AND c.type = ?'; params.push(type); }
  if (status) { query += ' AND c.status = ?'; params.push(status); }
  if (search) { query += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.location_text LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ` ORDER BY 
    CASE WHEN c.priority = 'High' THEN 1 WHEN c.priority = 'Medium' THEN 2 WHEN c.priority = 'Low' THEN 3 ELSE 4 END ASC,
    upvote_count DESC, c.created_at DESC 
    LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER COMPLAINT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/complaints/my — user's own complaints
app.get('/api/complaints/my', auth(['user']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM upvotes WHERE complaint_id = c.id) AS upvote_count
      FROM complaints c WHERE c.user_id = ? ORDER BY c.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints — submit new complaint
app.post('/api/complaints', auth(['user']), upload.single('image'), async (req, res) => {
  const { title, description, type, location_text, latitude, longitude } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const aiResult = await require('./services/ai_evaluator').analyzeComplaint(title, description, type, !!req.file);
    
    const [result] = await pool.query(
      'INSERT INTO complaints (user_id, title, description, type, location_text, latitude, longitude, image_url, priority, is_verified, ai_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [req.user.id, title, description, type || 'Others', location_text || null, latitude || null, longitude || null, image_url, aiResult.priority, aiResult.isVerified, aiResult.aiReason]
    );
    // Insert initial timeline entry
    await pool.query(
      'INSERT INTO complaint_updates (complaint_id, updated_by, status, comment) VALUES (?,?,?,?)',
      [result.insertId, req.user.id, 'Submitted', `Complaint submitted by citizen. AI Assessment: ${aiResult.emotion}`]
    );
    res.status(201).json({ message: 'Complaint submitted successfully', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/:id — single complaint with timeline
app.get('/api/complaints/:id', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, u.name AS reporter_name,
        (SELECT COUNT(*) FROM upvotes WHERE complaint_id = c.id) AS upvote_count
      FROM complaints c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Complaint not found' });
    const complaint = rows[0];

    const [timeline] = await pool.query(`
      SELECT cu.*, u.name AS updated_by_name, u.role AS updated_by_role
      FROM complaint_updates cu JOIN users u ON cu.updated_by = u.id
      WHERE cu.complaint_id = ? ORDER BY cu.created_at ASC
    `, [req.params.id]);
    complaint.timeline = timeline;

    const [assignment] = await pool.query(`
      SELECT ca.*, u.name AS worker_name FROM complaint_assignments ca
      JOIN users u ON ca.worker_id = u.id WHERE ca.complaint_id = ?
      ORDER BY ca.assigned_at DESC LIMIT 1
    `, [req.params.id]);
    complaint.assignment = assignment[0] || null;

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints/:id/upvote
app.post('/api/complaints/:id/upvote', auth(['user']), async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM upvotes WHERE complaint_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length) {
      await pool.query('DELETE FROM upvotes WHERE complaint_id = ? AND user_id = ?', [req.params.id, req.user.id]);
      await pool.query('UPDATE complaints SET upvotes = upvotes - 1 WHERE id = ? AND upvotes > 0', [req.params.id]);
      return res.json({ upvoted: false });
    }
    await pool.query('INSERT INTO upvotes (complaint_id, user_id) VALUES (?,?)', [req.params.id, req.user.id]);
    await pool.query('UPDATE complaints SET upvotes = upvotes + 1 WHERE id = ?', [req.params.id]);
    res.json({ upvoted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/stats
app.get('/api/admin/stats', auth(['admin']), async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status='Submitted') AS submitted,
        SUM(status='Verified') AS verified,
        SUM(status='Assigned') AS assigned,
        SUM(status='In Progress') AS in_progress,
        SUM(status='Completed') AS completed,
        SUM(status='Closed') AS closed
      FROM complaints
    `);
    const [byType] = await pool.query(`
      SELECT type, COUNT(*) AS count FROM complaints GROUP BY type ORDER BY count DESC
    `);
    const [recent] = await pool.query(`
      SELECT c.id, c.title, c.type, c.status, c.created_at, u.name AS reporter
      FROM complaints c JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC LIMIT 5
    `);
    res.json({ totals, byType, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/complaints
app.get('/api/admin/complaints', auth(['admin']), async (req, res) => {
  const { type, status, search, page = 1, limit = 25 } = req.query;
  let query = `
    SELECT c.*, u.name AS reporter_name,
      (SELECT COUNT(*) FROM upvotes WHERE complaint_id = c.id) AS upvote_count,
      (SELECT wu.name FROM complaint_assignments ca JOIN users wu ON ca.worker_id = wu.id WHERE ca.complaint_id = c.id ORDER BY ca.assigned_at DESC LIMIT 1) AS assigned_worker
    FROM complaints c JOIN users u ON c.user_id = u.id WHERE 1=1
  `;
  const params = [];
  if (type) { query += ' AND c.type = ?'; params.push(type); }
  if (status) { query += ' AND c.status = ?'; params.push(status); }
  if (search) { query += ' AND (c.title LIKE ? OR u.name LIKE ? OR c.location_text LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ` ORDER BY 
    CASE WHEN c.priority = 'High' THEN 1 WHEN c.priority = 'Medium' THEN 2 WHEN c.priority = 'Low' THEN 3 ELSE 4 END ASC,
    upvote_count DESC, c.created_at DESC 
    LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/workers
app.get('/api/admin/workers', auth(['admin']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, phone FROM users WHERE role = ?', ['worker']);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/complaints/:id/assign
app.put('/api/admin/complaints/:id/assign', auth(['admin']), async (req, res) => {
  const { worker_id, notes } = req.body;
  if (!worker_id) return res.status(400).json({ error: 'Worker ID required' });
  try {
    await pool.query('DELETE FROM complaint_assignments WHERE complaint_id = ?', [req.params.id]);
    await pool.query(
      'INSERT INTO complaint_assignments (complaint_id, worker_id, notes) VALUES (?,?,?)',
      [req.params.id, worker_id, notes || null]
    );
    await pool.query("UPDATE complaints SET status = 'Assigned' WHERE id = ?", [req.params.id]);
    await pool.query(
      'INSERT INTO complaint_updates (complaint_id, updated_by, status, comment) VALUES (?,?,?,?)',
      [req.params.id, req.user.id, 'Assigned', `Assigned to a field worker. Notes: ${notes || 'None'}`]
    );
    res.json({ message: 'Worker assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/complaints/:id/status
app.put('/api/admin/complaints/:id/status', auth(['admin']), async (req, res) => {
  const { status, comment } = req.body;
  const validStatuses = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Completed', 'Closed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await pool.query('UPDATE complaints SET status = ? WHERE id = ?', [status, req.params.id]);
    await pool.query(
      'INSERT INTO complaint_updates (complaint_id, updated_by, status, comment) VALUES (?,?,?,?)',
      [req.params.id, req.user.id, status, comment || `Status changed to ${status} by admin.`]
    );
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/complaints/:id
app.delete('/api/admin/complaints/:id', auth(['admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM complaints WHERE id = ?', [req.params.id]);
    res.json({ message: 'Complaint deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WORKER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/worker/assigned
app.get('/api/worker/assigned', auth(['worker']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, ca.notes AS assignment_notes, ca.assigned_at,
        u.name AS reporter_name,
        (SELECT COUNT(*) FROM upvotes WHERE complaint_id = c.id) AS upvote_count
      FROM complaint_assignments ca
      JOIN complaints c ON ca.complaint_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE ca.worker_id = ? 
      ORDER BY 
        CASE WHEN c.priority = 'High' THEN 1 WHEN c.priority = 'Medium' THEN 2 WHEN c.priority = 'Low' THEN 3 ELSE 4 END ASC,
        upvote_count DESC, ca.assigned_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/worker/complaints/:id/update
app.put('/api/worker/complaints/:id/update', auth(['worker']), upload.single('proof'), async (req, res) => {
  const { status, comment } = req.body;
  const validStatuses = ['In Progress', 'Completed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status for worker' });
  const proof_url = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    await pool.query('UPDATE complaints SET status = ? WHERE id = ?', [status, req.params.id]);
    await pool.query(
      'INSERT INTO complaint_updates (complaint_id, updated_by, status, comment, proof_image_url) VALUES (?,?,?,?,?)',
      [req.params.id, req.user.id, status, comment || `Status updated to ${status}.`, proof_url]
    );
    res.json({ message: 'Complaint status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(PORT, () => {
  console.log(`🚀 CivicTrack server running on http://localhost:${PORT}`);
});

/*
 * server.js
 *
 * Express and WebSocket server for the ScrumOwl application using PostgreSQL.
 * This server exposes a REST API and real‑time update channels compatible
 * with the front‑end described in the types.ts file. It leverages a
 * PostgreSQL database via the pg module for persistence and ws for
 * bi‑directional communication. Most of the routes follow the semantics
 * defined in our SQLite/WS implementation; this version adapts queries
 * to use async pool.query calls and includes basic error handling.
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const WebSocket = require('ws');
const { pool, initSchema } = require('./db');

// Environment configuration: default port and optional SSL via DATABASE_SSL
const PORT = process.env.PORT || 30200;

// Initialise Express and HTTP server; WebSocket attaches to HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// In‑memory map of WebSocket clients per board. Each key holds a Set of
// WebSocket connections. When something changes on a board we notify
// all subscribed clients. The boardId is passed as a query parameter on
// connection (e.g. ws://host:port?boardId=<id>). See connection handler below.
const clientsPerBoard = new Map();

/**
 * Broadcast a message to all connected clients for a given board. If
 * no clients are connected, nothing happens. Payload must be
 * serialisable to JSON.
 *
 * @param {string} boardId
 * @param {object} payload
 */
function broadcast(boardId, payload) {
  const clients = clientsPerBoard.get(boardId);
  if (!clients || clients.size === 0) return;
  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/**
 * Safely parse JSON strings stored in the database. In case of null or
 * parsing errors, returns a provided default value instead.
 *
 * @param {string | null} value
 * @param {any} def
 */
function safeParse(value, def = []) {
  if (value == null) return def;
  try {
    return JSON.parse(value);
  } catch {
    return def;
  }
}

/**
 * Convert a work item row from the database into an object matching
 * the WorkItem interface used in the front‑end. Fetches assignees
 * asynchronously and returns a structured object with nested user
 * objects. Many optional fields default to undefined if absent.
 *
 * @param {object} row Raw row from work_items table
 */
async function mapWorkItem(row) {
  // Fetch all assignees for this item
  const assRes = await pool.query(
    `SELECT ua.user_id, ua.is_primary, u.name, u.email, u.avatar_url
     FROM work_item_assignees ua
     JOIN users u ON ua.user_id = u.id
     WHERE ua.item_id = $1`,
    [row.id]
  );
  const assignees = assRes.rows.map((a) => ({
    id: a.user_id,
    name: a.name,
    email: a.email,
    avatarUrl: a.avatar_url,
    isPrimary: a.is_primary,
  }));
  const primary = assignees.find((a) => a.isPrimary);

  // Reporter (creator) if present
  let reporter = null;
  if (row.reporter_id) {
    const repRes = await pool.query(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
      [row.reporter_id]
    );
    if (repRes.rows.length > 0) {
      const r = repRes.rows[0];
      reporter = { id: r.id, name: r.name, email: r.email, avatarUrl: r.avatar_url };
    }
  }

  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    type: row.type,
    status: row.status,
    assignee: primary ? { id: primary.id, name: primary.name, email: primary.email, avatarUrl: primary.avatarUrl } : undefined,
    assignees: assignees.map((a) => ({ id: a.id, name: a.name, email: a.email, avatarUrl: a.avatarUrl })),
    reporter,
    priority: row.priority,
    sprintId: row.sprint_id || undefined,
    sprintBinding: undefined,
    doneInSprintId: row.done_in_sprint_id || undefined,
    group: row.group_name || undefined,
    stack: row.stack || undefined,
    estimationPoints: row.estimation_points || undefined,
    effortHours: row.effort_hours || undefined,
    dueDate: row.due_date || undefined,
    labels: safeParse(row.labels, []),
    checklist: safeParse(row.checklist, []),
    attachments: safeParse(row.attachments, []),
    watchers: safeParse(row.watchers, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version || 1,
    parentId: row.parent_id || undefined,
    childrenIds: undefined,
    epicId: row.epic_id || undefined,
    epicInfo: undefined,
    teamId: row.team_id || undefined,
    teamInfo: undefined,
    isUpdated: false,
  };
}

/**
 * Initialise the database schema before accepting requests. This will
 * create tables if they don't exist and seed default roles. If
 * something goes wrong the server will log the error and exit.
 */
initSchema().catch((err) => {
  console.error('Failed to initialise database schema:', err);
  process.exit(1);
});

// WebSocket connection handler: expects boardId query param. Stores
// connection in clientsPerBoard. Responds to pings. Cleans up on close.
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const boardId = url.searchParams.get('boardId');
  if (!boardId) {
    ws.close(1008, 'boardId required');
    return;
  }
  if (!clientsPerBoard.has(boardId)) {
    clientsPerBoard.set(boardId, new Set());
  }
  clientsPerBoard.get(boardId).add(ws);
  ws.on('message', (msg) => {
    try {
      const obj = JSON.parse(msg);
      if (obj.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
      }
    } catch {
      // ignore malformed
    }
  });
  ws.on('close', () => {
    const set = clientsPerBoard.get(boardId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) clientsPerBoard.delete(boardId);
    }
  });
});

// Health check
app.get('/api', (req, res) => {
  res.json({ ok: true, name: 'ScrumOwl API', db: 'postgres', version: '0.1' });
});

/*
 * Boards endpoints
 */
// List all boards
app.get('/api/boards', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, key, created_at, updated_at FROM boards WHERE deleted_at IS NULL OR deleted_at IS NULL');
    res.json(result.rows.map((b) => ({ id: b.id, name: b.name, key: b.key, createdAt: b.created_at, updatedAt: b.updated_at })));
  } catch (err) {
    console.error('Error fetching boards:', err);
    res.status(500).json({ error: 'failed to fetch boards' });
  }
});

// Create a board
app.post('/api/boards', async (req, res) => {
  const { name, key } = req.body;
  if (!name || !key) {
    res.status(400).json({ error: 'name and key are required' });
    return;
  }
  const id = uuidv4();
  try {
    await pool.query('INSERT INTO boards(id, name, key) VALUES ($1, $2, $3)', [id, name, key]);
    res.status(201).json({ id, name, key });
  } catch (err) {
    console.error('Error creating board:', err);
    res.status(500).json({ error: 'failed to create board' });
  }
});

/*
 * Roles endpoint
 */
// List roles
app.get('/api/roles', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM roles');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: 'failed to fetch roles' });
  }
});

/*
 * Board members endpoints
 */
// Get members of a board with role info
app.get('/api/boards/:boardId/members', async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query(
      `SELECT bm.user_id, bm.role_id, u.name, u.email, u.avatar_url, r.name AS role_name
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
       JOIN roles r ON r.id = bm.role_id
       WHERE bm.board_id = $1`,
      [boardId]
    );
    const members = result.rows.map((m) => ({
      user: { id: m.user_id, name: m.name, email: m.email, avatarUrl: m.avatar_url },
      role: { id: m.role_id, name: m.role_name },
    }));
    res.json(members);
  } catch (err) {
    console.error('Error fetching board members:', err);
    res.status(500).json({ error: 'failed to fetch members' });
  }
});

// Add or update a board member
app.post('/api/boards/:boardId/members', async (req, res) => {
  const { boardId } = req.params;
  const { userId, roleId, name, email, avatarUrl } = req.body;
  if (!userId && !name) {
    res.status(400).json({ error: 'userId or name/email required' });
    return;
  }
  // If userId not provided, create a new user
  let uid = userId;
  try {
    await pool.query('BEGIN');
    if (!uid) {
      uid = uuidv4();
      await pool.query('INSERT INTO users(id, name, email, avatar_url) VALUES ($1, $2, $3, $4)', [uid, name, email || null, avatarUrl || null]);
    }
    // Upsert member
    await pool.query(
      `INSERT INTO board_members(board_id, user_id, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (board_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
      [boardId, uid, roleId]
    );
    await pool.query('COMMIT');
    res.status(201).json({ userId: uid, roleId });
    // Notify board
    broadcast(boardId, { type: 'member.updated', userId: uid, roleId });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error adding board member:', err);
    res.status(500).json({ error: 'failed to add member' });
  }
});

/*
 * Teams endpoints
 */
// List teams for a board
app.get('/api/boards/:boardId/teams', async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query('SELECT id, name, color FROM teams WHERE board_id = $1 AND deleted_at IS NULL', [boardId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'failed to fetch teams' });
  }
});

// Create a team
app.post('/api/boards/:boardId/teams', async (req, res) => {
  const { boardId } = req.params;
  const { name, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const teamId = uuidv4();
  try {
    await pool.query('INSERT INTO teams(id, board_id, name, color) VALUES ($1, $2, $3, $4)', [teamId, boardId, name, color || null]);
    res.status(201).json({ id: teamId, name, color });
    broadcast(boardId, { type: 'team.created', id: teamId, name, color });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'failed to create team' });
  }
});

// Get team members
app.get('/api/teams/:teamId/members', async (req, res) => {
  const { teamId } = req.params;
  try {
    const result = await pool.query(
      `SELECT tm.user_id, u.name, u.email, u.avatar_url
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [teamId]
    );
    const members = result.rows.map((r) => ({ id: r.user_id, name: r.name, email: r.email, avatarUrl: r.avatar_url }));
    res.json(members);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ error: 'failed to fetch team members' });
  }
});

// Add member to team
app.post('/api/teams/:teamId/members', async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }
  try {
    await pool.query('INSERT INTO team_members(team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [teamId, userId]);
    res.status(201).json({ teamId, userId });
  } catch (err) {
    console.error('Error adding team member:', err);
    res.status(500).json({ error: 'failed to add team member' });
  }
});

/*
 * Epics endpoints
 */
// List epics for a board
app.get('/api/boards/:boardId/epics', async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, name, summary, description, color, ice_impact, ice_confidence, ice_ease, status, created_at, updated_at
       FROM epics
       WHERE board_id = $1 AND deleted_at IS NULL`,
      [boardId]
    );
    res.json(result.rows.map((e) => ({
      id: e.id,
      boardId,
      name: e.name,
      summary: e.summary,
      description: e.description,
      color: e.color,
      iceImpact: e.ice_impact,
      iceConfidence: e.ice_confidence,
      iceEase: e.ice_ease,
      status: e.status,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching epics:', err);
    res.status(500).json({ error: 'failed to fetch epics' });
  }
});

// Create an epic
app.post('/api/boards/:boardId/epics', async (req, res) => {
  const { boardId } = req.params;
  const { name, summary, description, color, iceImpact, iceConfidence, iceEase, status } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const id = uuidv4();
  try {
    await pool.query(
      `INSERT INTO epics(id, board_id, name, summary, description, color, ice_impact, ice_confidence, ice_ease, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, boardId, name, summary || null, description || null, color || null, iceImpact || null, iceConfidence || null, iceEase || null, status || 'ACTIVE']
    );
    res.status(201).json({ id, boardId, name, summary, description, color, iceImpact, iceConfidence, iceEase, status: status || 'ACTIVE' });
    broadcast(boardId, { type: 'epic.created', epicId: id });
  } catch (err) {
    console.error('Error creating epic:', err);
    res.status(500).json({ error: 'failed to create epic' });
  }
});

// Get an epic
app.get('/api/epics/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM epics WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const e = result.rows[0];
    res.json({
      id: e.id,
      boardId: e.board_id,
      name: e.name,
      summary: e.summary,
      description: e.description,
      color: e.color,
      iceImpact: e.ice_impact,
      iceConfidence: e.ice_confidence,
      iceEase: e.ice_ease,
      status: e.status,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    });
  } catch (err) {
    console.error('Error reading epic:', err);
    res.status(500).json({ error: 'failed to read epic' });
  }
});

// Update an epic
app.patch('/api/epics/:id', async (req, res) => {
  const { id } = req.params;
  const { name, summary, description, color, iceImpact, iceConfidence, iceEase, status } = req.body;
  try {
    const existing = await pool.query('SELECT board_id FROM epics WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existing.rows[0].board_id;
    await pool.query(
      `UPDATE epics
       SET name = COALESCE($2, name), summary = COALESCE($3, summary), description = COALESCE($4, description),
           color = COALESCE($5, color), ice_impact = COALESCE($6, ice_impact), ice_confidence = COALESCE($7, ice_confidence),
           ice_ease = COALESCE($8, ice_ease), status = COALESCE($9, status), updated_at = NOW()
       WHERE id = $1`,
      [id, name, summary, description, color, iceImpact, iceConfidence, iceEase, status]
    );
    res.json({ id });
    broadcast(boardId, { type: 'epic.updated', epicId: id });
  } catch (err) {
    console.error('Error updating epic:', err);
    res.status(500).json({ error: 'failed to update epic' });
  }
});

// Soft delete an epic
app.delete('/api/epics/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT board_id FROM epics WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existing.rows[0].board_id;
    await pool.query('UPDATE epics SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ id });
    broadcast(boardId, { type: 'epic.deleted', epicId: id });
  } catch (err) {
    console.error('Error deleting epic:', err);
    res.status(500).json({ error: 'failed to delete epic' });
  }
});

/*
 * Sprints endpoints
 */
// List sprints for a board
app.get('/api/boards/:boardId/sprints', async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, name, goal, start_date, end_date, number, state, created_at, updated_at
       FROM sprints WHERE board_id = $1 AND deleted_at IS NULL ORDER BY start_date`,
      [boardId]
    );
    res.json(result.rows.map((s) => ({
      id: s.id,
      boardId,
      name: s.name,
      goal: s.goal,
      startDate: s.start_date,
      endDate: s.end_date,
      number: s.number,
      state: s.state,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching sprints:', err);
    res.status(500).json({ error: 'failed to fetch sprints' });
  }
});

// Create a sprint
app.post('/api/boards/:boardId/sprints', async (req, res) => {
  const { boardId } = req.params;
  const { name, goal, startDate, endDate, number, state } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const id = uuidv4();
  try {
    await pool.query(
      `INSERT INTO sprints(id, board_id, name, goal, start_date, end_date, number, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, boardId, name, goal || null, startDate || null, endDate || null, number || null, state || 'PLANNED']
    );
    res.status(201).json({ id, boardId, name, goal, startDate, endDate, number, state: state || 'PLANNED' });
    broadcast(boardId, { type: 'sprint.created', sprintId: id });
  } catch (err) {
    console.error('Error creating sprint:', err);
    res.status(500).json({ error: 'failed to create sprint' });
  }
});

// Get a sprint
app.get('/api/sprints/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM sprints WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const s = result.rows[0];
    res.json({
      id: s.id,
      boardId: s.board_id,
      name: s.name,
      goal: s.goal,
      startDate: s.start_date,
      endDate: s.end_date,
      number: s.number,
      state: s.state,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    });
  } catch (err) {
    console.error('Error reading sprint:', err);
    res.status(500).json({ error: 'failed to read sprint' });
  }
});

// Update a sprint
app.patch('/api/sprints/:id', async (req, res) => {
  const { id } = req.params;
  const { name, goal, startDate, endDate, number, state } = req.body;
  try {
    const existing = await pool.query('SELECT board_id FROM sprints WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existing.rows[0].board_id;
    await pool.query(
      `UPDATE sprints
       SET name = COALESCE($2, name), goal = COALESCE($3, goal), start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date), number = COALESCE($6, number), state = COALESCE($7, state), updated_at = NOW()
       WHERE id = $1`,
      [id, name, goal, startDate, endDate, number, state]
    );
    res.json({ id });
    broadcast(boardId, { type: 'sprint.updated', sprintId: id });
  } catch (err) {
    console.error('Error updating sprint:', err);
    res.status(500).json({ error: 'failed to update sprint' });
  }
});

// Soft delete a sprint
app.delete('/api/sprints/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT board_id FROM sprints WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existing.rows[0].board_id;
    await pool.query('UPDATE sprints SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ id });
    broadcast(boardId, { type: 'sprint.deleted', sprintId: id });
  } catch (err) {
    console.error('Error deleting sprint:', err);
    res.status(500).json({ error: 'failed to delete sprint' });
  }
});

// Assign epics to a sprint
app.post('/api/sprints/:id/epics', async (req, res) => {
  const { id } = req.params;
  const { epicIds } = req.body;
  if (!Array.isArray(epicIds)) {
    res.status(400).json({ error: 'epicIds must be an array' });
    return;
  }
  try {
    // Check sprint exists
    const sResult = await pool.query('SELECT board_id FROM sprints WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (sResult.rows.length === 0) {
      res.status(404).json({ error: 'sprint not found' });
      return;
    }
    const boardId = sResult.rows[0].board_id;
    await pool.query('BEGIN');
    // Remove existing links not in new list
    await pool.query('DELETE FROM sprint_epics WHERE sprint_id = $1 AND epic_id NOT IN (SELECT UNNEST($2::uuid[]))', [id, epicIds]);
    // Add new links
    for (const epicId of epicIds) {
      await pool.query(
        'INSERT INTO sprint_epics(sprint_id, epic_id) VALUES ($1, $2) ON CONFLICT (sprint_id, epic_id) DO NOTHING',
        [id, epicId]
      );
    }
    // Update work items that are part of these epics and not yet assigned to any sprint
    await pool.query(
      `UPDATE work_items SET sprint_id = $1
       WHERE epic_id = ANY($2::uuid[]) AND (sprint_id IS NULL OR sprint_id != $1) AND deleted_at IS NULL`,
      [id, epicIds]
    );
    await pool.query('COMMIT');
    res.json({ sprintId: id, epicIds });
    broadcast(boardId, { type: 'sprint.epics.updated', sprintId: id, epicIds });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error assigning epics to sprint:', err);
    res.status(500).json({ error: 'failed to assign epics' });
  }
});

/*
 * Work items endpoints
 */
// List work items for a board with optional filters: sprintId, epicId, status, assignee
app.get('/api/boards/:boardId/items', async (req, res) => {
  const { boardId } = req.params;
  const { sprintId, epicId, status, assignee } = req.query;
  try {
    // Build dynamic query and params
    let sql = 'SELECT * FROM work_items WHERE board_id = $1 AND deleted_at IS NULL';
    const params = [boardId];
    let idx = 2;
    if (sprintId) {
      sql += ` AND sprint_id = $${idx++}`;
      params.push(sprintId);
    }
    if (epicId) {
      sql += ` AND epic_id = $${idx++}`;
      params.push(epicId);
    }
    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    const result = await pool.query(sql, params);
    // For each item, fetch assignees and map
    const items = [];
    for (const row of result.rows) {
      if (assignee) {
        // Filter by assignee: check whether user is in work_item_assignees
        const check = await pool.query('SELECT 1 FROM work_item_assignees WHERE item_id = $1 AND user_id = $2', [row.id, assignee]);
        if (check.rows.length === 0) continue;
      }
      items.push(await mapWorkItem(row));
    }
    res.json(items);
  } catch (err) {
    console.error('Error fetching work items:', err);
    res.status(500).json({ error: 'failed to fetch work items' });
  }
});

// Create a work item
app.post('/api/boards/:boardId/items', async (req, res) => {
  const { boardId } = req.params;
  // Extract fields from request body
  const {
    title,
    summary,
    description,
    type,
    status,
    assigneeId,
    assignees,
    reporterId,
    priority,
    sprintId,
    epicId,
    teamId,
    stack,
    estimationPoints,
    effortHours,
    dueDate,
    labels,
    checklist,
    attachments,
    watchers,
    branchRequired,
    branchName,
    tocEnabled,
    parentId,
  } = req.body;
  if (!title || !type || !status) {
    res.status(400).json({ error: 'title, type and status are required' });
    return;
  }
  const id = uuidv4();
  try {
    await pool.query('BEGIN');
    // Insert work item
    await pool.query(
      `INSERT INTO work_items(
        id, board_id, title, summary, description, type, status, priority,
        estimation_points, effort_hours, due_date, epic_id, sprint_id, parent_id, team_id, stack,
        branch_required, branch_name, toc_enabled, labels, checklist, attachments, watchers,
        created_by, updated_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
      )`,
      [
        id,
        boardId,
        title,
        summary || null,
        description || null,
        type,
        status,
        priority || null,
        estimationPoints || null,
        effortHours || null,
        dueDate || null,
        epicId || null,
        sprintId || null,
        parentId || null,
        teamId || null,
        stack || null,
        branchRequired || false,
        branchName || null,
        tocEnabled || false,
        JSON.stringify(labels || []),
        JSON.stringify(checklist || []),
        JSON.stringify(attachments || []),
        JSON.stringify(watchers || []),
        reporterId || null,
        reporterId || null,
      ]
    );
    // Insert assignees: if assigneeId provided but assignees array not, treat as single primary
    let assList = [];
    if (Array.isArray(assignees) && assignees.length > 0) {
      assList = assignees;
    } else if (assigneeId) {
      assList = [{ userId: assigneeId, isPrimary: true }];
    }
    for (const a of assList) {
      await pool.query(
        'INSERT INTO work_item_assignees(item_id, user_id, is_primary) VALUES ($1, $2, $3)',
        [id, a.userId, a.isPrimary || false]
      );
    }
    await pool.query('COMMIT');
    const item = await mapWorkItem({
      id,
      board_id: boardId,
      title,
      summary,
      description,
      type,
      status,
      priority,
      estimation_points: estimationPoints,
      effort_hours: effortHours,
      due_date: dueDate,
      epic_id: epicId,
      sprint_id: sprintId,
      done_in_sprint_id: null,
      parent_id: parentId,
      team_id: teamId,
      stack,
      branch_required: branchRequired,
      branch_name: branchName,
      toc_enabled: tocEnabled,
      labels: JSON.stringify(labels || []),
      checklist: JSON.stringify(checklist || []),
      attachments: JSON.stringify(attachments || []),
      watchers: JSON.stringify(watchers || []),
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
      reporter_id: reporterId,
    });
    res.status(201).json(item);
    broadcast(boardId, { type: 'item.created', itemId: id });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating work item:', err);
    res.status(500).json({ error: 'failed to create work item' });
  }
});

// Get a work item
app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM work_items WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const item = await mapWorkItem(result.rows[0]);
    res.json(item);
  } catch (err) {
    console.error('Error reading work item:', err);
    res.status(500).json({ error: 'failed to read work item' });
  }
});

// Update a work item
app.patch('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  // Accept arbitrary set of fields; we will build dynamic SQL
  const fields = req.body;
  if (!fields || Object.keys(fields).length === 0) {
    res.status(400).json({ error: 'no fields to update' });
    return;
  }
  try {
    // Get existing row to know boardId and to create transition logs if status changes
    const existingRes = await pool.query('SELECT * FROM work_items WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const existing = existingRes.rows[0];
    const boardId = existing.board_id;
    await pool.query('BEGIN');
    // Build update SQL. We'll update JSON fields if provided
    const sets = [];
    const params = [];
    let paramIndex = 1;
    function addSet(col, val) {
      sets.push(`${col} = $${paramIndex}`);
      params.push(val);
      paramIndex++;
    }
    if (fields.title !== undefined) addSet('title', fields.title);
    if (fields.summary !== undefined) addSet('summary', fields.summary);
    if (fields.description !== undefined) addSet('description', fields.description);
    if (fields.type !== undefined) addSet('type', fields.type);
    if (fields.status !== undefined) addSet('status', fields.status);
    if (fields.priority !== undefined) addSet('priority', fields.priority);
    if (fields.estimationPoints !== undefined) addSet('estimation_points', fields.estimationPoints);
    if (fields.effortHours !== undefined) addSet('effort_hours', fields.effortHours);
    if (fields.dueDate !== undefined) addSet('due_date', fields.dueDate);
    if (fields.epicId !== undefined) addSet('epic_id', fields.epicId);
    if (fields.sprintId !== undefined) addSet('sprint_id', fields.sprintId);
    if (fields.doneInSprintId !== undefined) addSet('done_in_sprint_id', fields.doneInSprintId);
    if (fields.parentId !== undefined) addSet('parent_id', fields.parentId);
    if (fields.teamId !== undefined) addSet('team_id', fields.teamId);
    if (fields.stack !== undefined) addSet('stack', fields.stack);
    if (fields.branchRequired !== undefined) addSet('branch_required', fields.branchRequired);
    if (fields.branchName !== undefined) addSet('branch_name', fields.branchName);
    if (fields.tocEnabled !== undefined) addSet('toc_enabled', fields.tocEnabled);
    if (fields.labels !== undefined) addSet('labels', JSON.stringify(fields.labels));
    if (fields.checklist !== undefined) addSet('checklist', JSON.stringify(fields.checklist));
    if (fields.attachments !== undefined) addSet('attachments', JSON.stringify(fields.attachments));
    if (fields.watchers !== undefined) addSet('watchers', JSON.stringify(fields.watchers));
    // Always update updated_at
    addSet('updated_at', new Date());
    // Build SQL
    const sql = `UPDATE work_items SET ${sets.join(', ')} WHERE id = $${paramIndex}`;
    params.push(id);
    await pool.query(sql, params);
    // Handle assignees update if provided
    if (fields.assignees) {
      const ass = Array.isArray(fields.assignees) ? fields.assignees : [];
      await pool.query('DELETE FROM work_item_assignees WHERE item_id = $1', [id]);
      for (const a of ass) {
        await pool.query(
          'INSERT INTO work_item_assignees(item_id, user_id, is_primary) VALUES ($1, $2, $3)',
          [id, a.userId, a.isPrimary || false]
        );
      }
    }
    // If status changed to Done and doneInSprintId not set, set it
    if (fields.status && fields.status === 'Done' && !existing.done_in_sprint_id) {
      await pool.query('UPDATE work_items SET done_in_sprint_id = sprint_id WHERE id = $1', [id]);
    }
    await pool.query('COMMIT');
    const updatedItemRes = await pool.query('SELECT * FROM work_items WHERE id = $1', [id]);
    const updatedItem = await mapWorkItem(updatedItemRes.rows[0]);
    res.json(updatedItem);
    broadcast(boardId, { type: 'item.updated', itemId: id });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating work item:', err);
    res.status(500).json({ error: 'failed to update work item' });
  }
});

// Soft delete a work item
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existingRes = await pool.query('SELECT board_id FROM work_items WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existingRes.rows[0].board_id;
    await pool.query('UPDATE work_items SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ id });
    broadcast(boardId, { type: 'item.deleted', itemId: id });
  } catch (err) {
    console.error('Error deleting work item:', err);
    res.status(500).json({ error: 'failed to delete work item' });
  }
});

/*
 * Comments endpoints
 */
// List comments for an item
app.get('/api/items/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.id, c.user_id, u.name, u.email, u.avatar_url, c.content, c.mentions, c.created_at
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.item_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.created_at`,
      [id]
    );
    const comments = result.rows.map((c) => ({
      id: c.id,
      user: { id: c.user_id, name: c.name, email: c.email, avatarUrl: c.avatar_url },
      content: c.content,
      mentions: safeParse(c.mentions, []),
      createdAt: c.created_at,
    }));
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'failed to fetch comments' });
  }
});

// Create a comment on an item
app.post('/api/items/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { userId, content, mentions } = req.body;
  if (!userId || !content) {
    res.status(400).json({ error: 'userId and content required' });
    return;
  }
  const commentId = uuidv4();
  try {
    // Determine boardId for broadcast
    const itemRes = await pool.query('SELECT board_id FROM work_items WHERE id = $1', [id]);
    if (itemRes.rows.length === 0) {
      res.status(404).json({ error: 'item not found' });
      return;
    }
    const boardId = itemRes.rows[0].board_id;
    await pool.query(
      `INSERT INTO comments(id, item_id, board_id, user_id, content, mentions)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [commentId, id, boardId, userId, content, JSON.stringify(mentions || [])]
    );
    res.status(201).json({ id: commentId });
    broadcast(boardId, { type: 'comment.created', itemId: id, commentId });
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'failed to create comment' });
  }
});

/*
 * Events endpoints
 */
// List events for a board
app.get('/api/boards/:boardId/events', async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, title, description, start_at, end_at, location, link_url, privacy, created_by, created_at, updated_at
       FROM events
       WHERE board_id = $1 AND deleted_at IS NULL
       ORDER BY start_at`,
      [boardId]
    );
    res.json(result.rows.map((e) => ({
      id: e.id,
      boardId,
      title: e.title,
      description: e.description,
      startAt: e.start_at,
      endAt: e.end_at,
      location: e.location,
      linkUrl: e.link_url,
      privacy: e.privacy,
      createdBy: e.created_by,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'failed to fetch events' });
  }
});

// Create an event
app.post('/api/boards/:boardId/events', async (req, res) => {
  const { boardId } = req.params;
  const { title, description, startAt, endAt, location, linkUrl, privacy, attendees } = req.body;
  if (!title) {
    res.status(400).json({ error: 'title required' });
    return;
  }
  const eventId = uuidv4();
  try {
    await pool.query('BEGIN');
    await pool.query(
      `INSERT INTO events(id, board_id, title, description, start_at, end_at, location, link_url, privacy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [eventId, boardId, title, description || null, startAt || null, endAt || null, location || null, linkUrl || null, privacy || 'board']
    );
    // Add attendees
    if (Array.isArray(attendees)) {
      for (const a of attendees) {
        await pool.query('INSERT INTO event_attendees(event_id, user_id, status) VALUES ($1, $2, $3)', [eventId, a.userId, a.status || 'going']);
      }
    }
    await pool.query('COMMIT');
    res.status(201).json({ id: eventId });
    broadcast(boardId, { type: 'event.created', eventId });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'failed to create event' });
  }
});

// Get an event
app.get('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const e = result.rows[0];
    const attendeesRes = await pool.query(
      `SELECT ea.user_id, ea.status, u.name, u.email, u.avatar_url
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1`,
      [id]
    );
    const attendeesList = attendeesRes.rows.map((a) => ({ id: a.user_id, name: a.name, email: a.email, avatarUrl: a.avatar_url, status: a.status }));
    res.json({
      id: e.id,
      boardId: e.board_id,
      title: e.title,
      description: e.description,
      startAt: e.start_at,
      endAt: e.end_at,
      location: e.location,
      linkUrl: e.link_url,
      privacy: e.privacy,
      createdBy: e.created_by,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      attendees: attendeesList,
    });
  } catch (err) {
    console.error('Error reading event:', err);
    res.status(500).json({ error: 'failed to read event' });
  }
});

// Update an event
app.patch('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, startAt, endAt, location, linkUrl, privacy, attendees } = req.body;
  try {
    const existingRes = await pool.query('SELECT board_id FROM events WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existingRes.rows[0].board_id;
    await pool.query('BEGIN');
    await pool.query(
      `UPDATE events SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         start_at = COALESCE($4, start_at),
         end_at = COALESCE($5, end_at),
         location = COALESCE($6, location),
         link_url = COALESCE($7, link_url),
         privacy = COALESCE($8, privacy),
         updated_at = NOW()
       WHERE id = $1`,
      [id, title, description, startAt, endAt, location, linkUrl, privacy]
    );
    // Update attendees: remove existing and insert new
    if (attendees) {
      await pool.query('DELETE FROM event_attendees WHERE event_id = $1', [id]);
      for (const a of attendees) {
        await pool.query('INSERT INTO event_attendees(event_id, user_id, status) VALUES ($1,$2,$3)', [id, a.userId, a.status || 'going']);
      }
    }
    await pool.query('COMMIT');
    res.json({ id });
    broadcast(boardId, { type: 'event.updated', eventId: id });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'failed to update event' });
  }
});

// Soft delete event
app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existingRes = await pool.query('SELECT board_id FROM events WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const boardId = existingRes.rows[0].board_id;
    await pool.query('UPDATE events SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ id });
    broadcast(boardId, { type: 'event.deleted', eventId: id });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'failed to delete event' });
  }
});

/*
 * Reports endpoints
 */
// Burndown report: calculates ideal and actual remaining story points for a sprint
app.get('/api/reports/burndown', async (req, res) => {
  const { sprint_id: sprintId } = req.query;
  if (!sprintId) {
    res.status(400).json({ error: 'sprint_id required' });
    return;
  }
  try {
    // Get sprint details
    const sRes = await pool.query('SELECT board_id, start_date, end_date FROM sprints WHERE id = $1', [sprintId]);
    if (sRes.rows.length === 0) {
      res.status(404).json({ error: 'sprint not found' });
      return;
    }
    const sprint = sRes.rows[0];
    // Compute total estimation points of all items in this sprint
    const totalRes = await pool.query('SELECT COALESCE(SUM(estimation_points),0) as total FROM work_items WHERE sprint_id = $1 AND deleted_at IS NULL', [sprintId]);
    const totalPoints = parseInt(totalRes.rows[0].total, 10);
    // Build days array
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    // ideal line: linear burn from total to 0
    const ideal = days.map((_, idx) => totalPoints - Math.round((totalPoints / (days.length - 1)) * idx));
    // actual: subtract estimation points of items completed by each date
    const actual = [];
    let remaining = totalPoints;
    for (const day of days) {
      // Items with done_in_sprint_id = sprintId and updated_at <= day
      const doneRes = await pool.query(
        `SELECT COALESCE(SUM(estimation_points),0) as done
         FROM work_items
         WHERE sprint_id = $1 AND done_in_sprint_id = $1 AND updated_at::date <= $2 AND status = 'Done' AND deleted_at IS NULL`,
        [sprintId, day]
      );
      const done = parseInt(doneRes.rows[0].done, 10);
      remaining = totalPoints - done;
      if (remaining < 0) remaining = 0;
      actual.push(remaining);
    }
    res.json({
      labels: days.map((d) => d.toISOString().split('T')[0]),
      ideal,
      actual,
    });
  } catch (err) {
    console.error('Error generating burndown report:', err);
    res.status(500).json({ error: 'failed to generate report' });
  }
});

// Velocity report: sum estimation points of Done items per closed sprints
app.get('/api/reports/velocity', async (req, res) => {
  const { board_id: boardId, window } = req.query;
  const win = parseInt(window || '6', 10);
  try {
    // Get last N closed sprints for this board
    const sRes = await pool.query(
      `SELECT id, name, start_date, end_date
       FROM sprints
       WHERE board_id = $1 AND state = 'CLOSED'
       ORDER BY end_date DESC
       LIMIT $2`,
      [boardId, win]
    );
    const data = [];
    let total = 0;
    for (const s of sRes.rows.reverse()) {
      const sumRes = await pool.query(
        `SELECT COALESCE(SUM(estimation_points),0) as points
         FROM work_items
         WHERE sprint_id = $1 AND done_in_sprint_id = $1 AND status = 'Done' AND deleted_at IS NULL`,
        [s.id]
      );
      const points = parseInt(sumRes.rows[0].points, 10);
      data.push({ id: s.id, name: s.name, startDate: s.start_date, endDate: s.end_date, estimationDone: points });
      total += points;
    }
    const avg = data.length > 0 ? total / data.length : 0;
    res.json({ sprints: data, avg });
  } catch (err) {
    console.error('Error generating velocity report:', err);
    res.status(500).json({ error: 'failed to generate report' });
  }
});

// Epic progress report: list epics with percent done weighted by estimation
app.get('/api/reports/epics', async (req, res) => {
  const { board_id: boardId } = req.query;
  try {
    const epicsRes = await pool.query('SELECT id, name FROM epics WHERE board_id = $1 AND deleted_at IS NULL', [boardId]);
    const result = [];
    for (const e of epicsRes.rows) {
      const totalRes = await pool.query('SELECT COALESCE(SUM(estimation_points),0) as total FROM work_items WHERE epic_id = $1 AND deleted_at IS NULL', [e.id]);
      const doneRes = await pool.query(
        `SELECT COALESCE(SUM(estimation_points),0) as done FROM work_items
         WHERE epic_id = $1 AND status = 'Done' AND deleted_at IS NULL`,
        [e.id]
      );
      const total = parseInt(totalRes.rows[0].total, 10);
      const done = parseInt(doneRes.rows[0].done, 10);
      const percentDoneWeighted = total > 0 ? done / total : 0;
      result.push({ id: e.id, name: e.name, itemsTotal: total, itemsDone: done, percentDoneWeighted });
    }
    res.json({ rows: result });
  } catch (err) {
    console.error('Error generating epic report:', err);
    res.status(500).json({ error: 'failed to generate report' });
  }
});

// Assignee workload report: count open and in-progress items per assignee
app.get('/api/reports/workload', async (req, res) => {
  const { board_id: boardId } = req.query;
  try {
    // Get active items per assignee
    const resRows = await pool.query(
      `SELECT ua.user_id, u.name, u.email, u.avatar_url,
              SUM(CASE WHEN wi.status = 'Done' THEN 0 ELSE 1 END) as open_count,
              SUM(CASE WHEN wi.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
              SUM(COALESCE(wi.estimation_points,0)) as estimation_sum
       FROM work_item_assignees ua
       JOIN work_items wi ON ua.item_id = wi.id
       JOIN users u ON u.id = ua.user_id
       WHERE wi.board_id = $1 AND wi.deleted_at IS NULL
       GROUP BY ua.user_id, u.name, u.email, u.avatar_url
       ORDER BY u.name`,
      [boardId]
    );
    const rows = resRows.rows.map((r) => ({
      assignee: { id: r.user_id, name: r.name, email: r.email, avatarUrl: r.avatar_url },
      open: parseInt(r.open_count, 10),
      inProgress: parseInt(r.in_progress_count, 10),
      estimationSum: parseInt(r.estimation_sum, 10),
    }));
    res.json({ rows });
  } catch (err) {
    console.error('Error generating workload report:', err);
    res.status(500).json({ error: 'failed to generate report' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`ScrumOwl Postgres WebSocket API listening on port ${PORT}`);
});
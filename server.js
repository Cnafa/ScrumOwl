/*
 * server.js
 *
 * Exposes a REST API and WebSocket server for the ScrumOwl application.
 * This server is designed to harmonise with the front‑end types defined
 * in `types.ts` and the user stories discussed throughout the project.
 * It uses an embedded SQLite database via better‑sqlite3 and the ws
 * library for WebSocket communication. Real‑time updates are delivered
 * to connected clients on a per‑board basis. Each major entity –
 * boards, epics, sprints, work items and events – has CRUD endpoints.
 * Reports for burndown, velocity, epic progress and assignee workload
 * are also provided.
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');
const db = require('./db');

// Environment configuration. When deploying you can customise PORT
// and other parameters via environment variables.
const PORT = process.env.PORT || 30200;

// Initialise Express and HTTP server. Express handles REST while
// the HTTP server provides a socket for WebSocket traffic.
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware configuration
app.use(cors());
app.use(express.json());

// In‑memory registry of connected websocket clients organised by
// boardId. Each entry is a Set of WebSocket connections. When
// an event occurs on a board we can quickly broadcast to all
// subscribed clients.
const clientsPerBoard = new Map();

/**
 * Broadcasts a message to all WebSocket clients subscribed to a given
 * board. If no clients are subscribed the function is a no‑op.
 *
 * @param {string} boardId – the board to broadcast to
 * @param {object} payload – serialisable JSON payload
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
 * Helper to parse JSON strings stored in the database. Returns a
 * parsed object/array or a sensible default if parsing fails.
 *
 * @param {string|undefined|null} value
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
 * Ensures that the roles table contains the default roles. These
 * correspond to the RBAC described in the user stories. If a role
 * already exists it is skipped. This function should be called at
 * startup.
 */
function seedRoles() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM roles').get().count;
  if (existing > 0) return;
  const insert = db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)');
  insert.run('scrum_master', 'Scrum Master');
  insert.run('product_owner', 'Product Owner');
  insert.run('member', 'Member');
}

/**
 * Converts a database row representing a work item into a serialisable
 * object matching the TypeScript `WorkItem` interface. Assignees are
 * resolved via the `work_item_assignees` table and returned as an
 * array of User objects, with the primary assignee indicated by
 * `is_primary`.
 *
 * @param {object} row – raw DB row from work_items table
 */
function mapWorkItem(row) {
  const assignees = db
    .prepare(
      `SELECT ua.user_id, ua.is_primary, u.name, u.email, u.avatar_url
       FROM work_item_assignees ua
       JOIN users u ON ua.user_id = u.id
       WHERE ua.item_id = ?`
    )
    .all(row.id)
    .map((a) => ({
      id: a.user_id,
      name: a.name,
      email: a.email,
      avatarUrl: a.avatar_url,
      isPrimary: a.is_primary === 1,
    }));
  const primary = assignees.find((a) => a.isPrimary);
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
    reporter: (function () {
      const r = db
        .prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?')
        .get(row.reporter_id);
      return r ? { id: r.id, name: r.name, email: r.email, avatarUrl: r.avatar_url } : null;
    })(),
    priority: row.priority,
    sprintId: row.sprint_id || undefined,
    sprintBinding: undefined,
    doneInSprintId: row.done_in_sprint_id || undefined,
    group: row.group_name,
    stack: row.stack,
    estimationPoints: row.estimation_points,
    effortHours: row.effort_hours,
    dueDate: row.due_date,
    labels: safeParse(row.labels, []),
    checklist: safeParse(row.checklist, []),
    attachments: safeParse(row.attachments, []),
    watchers: safeParse(row.watchers, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    parentId: row.parent_id || undefined,
    childrenIds: undefined, // children will be filled lazily if needed
    epicId: row.epic_id || undefined,
    epicInfo: undefined,
    teamId: row.team_id || undefined,
    teamInfo: undefined,
    isUpdated: false,
  };
}

// Seed default roles before handling requests
seedRoles();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  // Extract boardId from the query string (e.g. ws://.../?boardId=abc)
  const params = new URLSearchParams(req.url.replace(/^.*\?/, ''));
  const boardId = params.get('boardId');
  if (!boardId) {
    ws.close(1008, 'boardId required');
    return;
  }
  // Register this connection under the board
  if (!clientsPerBoard.has(boardId)) {
    clientsPerBoard.set(boardId, new Set());
  }
  clientsPerBoard.get(boardId).add(ws);

  ws.on('close', () => {
    const set = clientsPerBoard.get(boardId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) clientsPerBoard.delete(boardId);
    }
  });

  // Optionally handle pings from client
  ws.on('message', (msg) => {
    try {
      const obj = JSON.parse(msg);
      if (obj.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
      }
    } catch {
      // ignore
    }
  });
});

// Health endpoint
app.get('/api', (req, res) => {
  res.json({ ok: true, name: 'ScrumOwl API', version: '0.1' });
});

/**
 * Boards
 */
app.get('/api/boards', (req, res) => {
  const rows = db.prepare('SELECT id, name, key FROM boards WHERE 1').all();
  res.json(rows);
});

app.post('/api/boards', (req, res) => {
  const { name, key } = req.body;
  if (!name || !key) {
    return res.status(400).json({ error: 'name and key are required' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO boards (id, name, key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, key, now, now);
  res.json({ id, name, key });
});

/**
 * Roles
 */
app.get('/api/roles', (req, res) => {
  const roles = db.prepare('SELECT id, name FROM roles').all();
  res.json(roles);
});

/**
 * Board members
 */
app.get('/api/boards/:boardId/members', (req, res) => {
  const { boardId } = req.params;
  const rows = db
    .prepare(
      `SELECT bm.user_id, bm.role_id, u.name, u.email, u.avatar_url, r.name as role_name
       FROM board_members bm
       JOIN users u ON bm.user_id = u.id
       JOIN roles r ON bm.role_id = r.id
       WHERE bm.board_id = ?`
    )
    .all(boardId);
  const members = rows.map((row) => ({
    user: { id: row.user_id, name: row.name, email: row.email, avatarUrl: row.avatar_url },
    roleId: row.role_id,
    roleName: row.role_name,
  }));
  res.json(members);
});

app.post('/api/boards/:boardId/members', (req, res) => {
  const { boardId } = req.params;
  const { userId, roleId } = req.body;
  if (!userId || !roleId) {
    return res.status(400).json({ error: 'userId and roleId are required' });
  }
  try {
    db.prepare(
      'INSERT INTO board_members (board_id, user_id, role_id) VALUES (?, ?, ?)'
    ).run(boardId, userId, roleId);
    res.json({ boardId, userId, roleId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Teams
 */
app.get('/api/boards/:boardId/teams', (req, res) => {
  const { boardId } = req.params;
  const rows = db.prepare('SELECT id, name, description FROM teams WHERE board_id = ?').all(boardId);
  res.json(rows);
});

app.post('/api/boards/:boardId/teams', (req, res) => {
  const { boardId } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO teams (id, board_id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, boardId, name, description || '', now, now);
  res.json({ id, boardId, name, description });
});

app.get('/api/teams/:teamId/members', (req, res) => {
  const { teamId } = req.params;
  const rows = db
    .prepare(
      `SELECT tm.user_id, u.name, u.email, u.avatar_url
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`
    )
    .all(teamId);
  const members = rows.map((r) => ({ id: r.user_id, name: r.name, email: r.email, avatarUrl: r.avatar_url }));
  res.json(members);
});

app.post('/api/teams/:teamId/members', (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(teamId, userId);
    res.json({ teamId, userId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Epics
 */
app.get('/api/boards/:boardId/epics', (req, res) => {
  const { boardId } = req.params;
  const rows = db
    .prepare(
      `SELECT * FROM epics WHERE board_id = ? AND deleted_at IS NULL`
    )
    .all(boardId);
  const epics = rows.map((r) => ({
    id: r.id,
    boardId: r.board_id,
    name: r.name,
    aiSummary: r.summary || '',
    description: r.description || '',
    attachments: [], // attachments stored separately if needed
    ease: r.ice_ease,
    impact: r.ice_impact,
    confidence: r.ice_confidence,
    iceScore: r.ice_impact + r.ice_confidence + r.ice_ease,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    color: r.color || '#CCCCCC',
    status: r.status,
    archivedAt: null,
    deletedAt: r.deleted_at,
  }));
  res.json(epics);
});

app.post('/api/boards/:boardId/epics', (req, res) => {
  const { boardId } = req.params;
  const { name, summary, description, color, ease, impact, confidence } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = 'ACTIVE';
  db.prepare(
    `INSERT INTO epics (id, board_id, name, color, summary, description, ice_impact, ice_confidence, ice_ease, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    boardId,
    name,
    color || '#CCCCCC',
    summary || '',
    description || '',
    impact || 0,
    confidence || 0,
    ease || 0,
    status,
    now,
    now
  );
  const epic = {
    id,
    boardId,
    name,
    aiSummary: summary || '',
    description: description || '',
    attachments: [],
    ease: ease || 0,
    impact: impact || 0,
    confidence: confidence || 0,
    iceScore: (impact || 0) + (confidence || 0) + (ease || 0),
    createdAt: now,
    updatedAt: now,
    color: color || '#CCCCCC',
    status,
    archivedAt: null,
    deletedAt: null,
  };
  res.json(epic);
  broadcast(boardId, { type: 'epic.created', epic });
});

app.get('/api/epics/:epicId', (req, res) => {
  const { epicId } = req.params;
  const r = db.prepare('SELECT * FROM epics WHERE id = ?').get(epicId);
  if (!r || r.deleted_at) return res.status(404).json({ error: 'Epic not found' });
  const epic = {
    id: r.id,
    boardId: r.board_id,
    name: r.name,
    aiSummary: r.summary || '',
    description: r.description || '',
    attachments: [],
    ease: r.ice_ease,
    impact: r.ice_impact,
    confidence: r.ice_confidence,
    iceScore: r.ice_impact + r.ice_confidence + r.ice_ease,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    color: r.color || '#CCCCCC',
    status: r.status,
    archivedAt: null,
    deletedAt: r.deleted_at,
  };
  res.json(epic);
});

app.patch('/api/epics/:epicId', (req, res) => {
  const { epicId } = req.params;
  const fields = req.body;
  const current = db.prepare('SELECT * FROM epics WHERE id = ?').get(epicId);
  if (!current || current.deleted_at) return res.status(404).json({ error: 'Epic not found' });
  const now = new Date().toISOString();
  const updates = [];
  const params = [];
  const allowed = ['name', 'summary', 'description', 'color', 'ice_impact', 'ice_confidence', 'ice_ease', 'status'];
  allowed.forEach((col) => {
    const bodyKey = col === 'ice_impact' ? 'impact' : col === 'ice_confidence' ? 'confidence' : col === 'ice_ease' ? 'ease' : col;
    if (fields.hasOwnProperty(bodyKey)) {
      updates.push(`${col} = ?`);
      params.push(fields[bodyKey]);
    }
  });
  if (updates.length > 0) {
    params.push(now, epicId);
    const sql = `UPDATE epics SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`;
    db.prepare(sql).run(...params);
  }
  const updated = db.prepare('SELECT * FROM epics WHERE id = ?').get(epicId);
  const epic = {
    id: updated.id,
    boardId: updated.board_id,
    name: updated.name,
    aiSummary: updated.summary || '',
    description: updated.description || '',
    attachments: [],
    ease: updated.ice_ease,
    impact: updated.ice_impact,
    confidence: updated.ice_confidence,
    iceScore: updated.ice_impact + updated.ice_confidence + updated.ice_ease,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
    color: updated.color || '#CCCCCC',
    status: updated.status,
    archivedAt: null,
    deletedAt: updated.deleted_at,
  };
  res.json(epic);
  broadcast(updated.board_id, { type: 'epic.updated', epic });
});

app.delete('/api/epics/:epicId', (req, res) => {
  const { epicId } = req.params;
  const epic = db.prepare('SELECT * FROM epics WHERE id = ?').get(epicId);
  if (!epic || epic.deleted_at) return res.status(404).json({ error: 'Epic not found' });
  const now = new Date().toISOString();
  db.prepare('UPDATE epics SET deleted_at = ?, status = ? WHERE id = ?').run(now, 'DELETED', epicId);
  res.json({ id: epicId, deletedAt: now });
  broadcast(epic.board_id, { type: 'epic.deleted', id: epicId });
});

/**
 * Sprints
 */
app.get('/api/boards/:boardId/sprints', (req, res) => {
  const { boardId } = req.params;
  const rows = db
    .prepare(
      `SELECT * FROM sprints WHERE board_id = ? AND (deleted_at IS NULL)`
    )
    .all(boardId);
  const sprints = rows.map((r) => ({
    id: r.id,
    boardId: r.board_id,
    number: r.number,
    name: r.name,
    goal: r.goal || '',
    startAt: r.start_date,
    endAt: r.end_date,
    state: r.state,
    epicIds: db
      .prepare('SELECT epic_id FROM sprint_epics WHERE sprint_id = ?')
      .all(r.id)
      .map((e) => e.epic_id),
    deletedAt: r.deleted_at,
  }));
  res.json(sprints);
});

app.post('/api/boards/:boardId/sprints', (req, res) => {
  const { boardId } = req.params;
  const { name, number, goal, startAt, endAt, state } = req.body;
  if (!name || !startAt || !endAt) {
    return res.status(400).json({ error: 'name, startAt and endAt are required' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sprints (id, board_id, name, number, goal, start_date, end_date, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    boardId,
    name,
    number || null,
    goal || '',
    startAt,
    endAt,
    state || 'PLANNED',
    now,
    now
  );
  const sprint = {
    id,
    boardId,
    number: number || null,
    name,
    goal: goal || '',
    startAt,
    endAt,
    state: state || 'PLANNED',
    epicIds: [],
    deletedAt: null,
  };
  res.json(sprint);
  broadcast(boardId, { type: 'sprint.created', sprint });
});

app.get('/api/sprints/:sprintId', (req, res) => {
  const { sprintId } = req.params;
  const r = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
  if (!r || r.deleted_at) return res.status(404).json({ error: 'Sprint not found' });
  const sprint = {
    id: r.id,
    boardId: r.board_id,
    number: r.number,
    name: r.name,
    goal: r.goal || '',
    startAt: r.start_date,
    endAt: r.end_date,
    state: r.state,
    epicIds: db
      .prepare('SELECT epic_id FROM sprint_epics WHERE sprint_id = ?')
      .all(r.id)
      .map((e) => e.epic_id),
    deletedAt: r.deleted_at,
  };
  res.json(sprint);
});

app.patch('/api/sprints/:sprintId', (req, res) => {
  const { sprintId } = req.params;
  const fields = req.body;
  const current = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
  if (!current || current.deleted_at) return res.status(404).json({ error: 'Sprint not found' });
  const now = new Date().toISOString();
  const updates = [];
  const params = [];
  const allowed = ['name', 'number', 'goal', 'start_date', 'end_date', 'state'];
  allowed.forEach((col) => {
    const bodyKey = col === 'start_date' ? 'startAt' : col === 'end_date' ? 'endAt' : col;
    if (fields.hasOwnProperty(bodyKey)) {
      updates.push(`${col} = ?`);
      params.push(fields[bodyKey]);
    }
  });
  if (updates.length > 0) {
    params.push(now, sprintId);
    const sql = `UPDATE sprints SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`;
    db.prepare(sql).run(...params);
  }
  // Handle epic assignments if provided
  if (fields.epicIds) {
    // Remove old links
    db.prepare('DELETE FROM sprint_epics WHERE sprint_id = ?').run(sprintId);
    // Add new links
    const insert = db.prepare('INSERT INTO sprint_epics (sprint_id, epic_id) VALUES (?, ?)');
    fields.epicIds.forEach((epicId) => insert.run(sprintId, epicId));
  }
  const updated = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
  const sprint = {
    id: updated.id,
    boardId: updated.board_id,
    number: updated.number,
    name: updated.name,
    goal: updated.goal || '',
    startAt: updated.start_date,
    endAt: updated.end_date,
    state: updated.state,
    epicIds: db
      .prepare('SELECT epic_id FROM sprint_epics WHERE sprint_id = ?')
      .all(updated.id)
      .map((e) => e.epic_id),
    deletedAt: updated.deleted_at,
  };
  res.json(sprint);
  broadcast(updated.board_id, { type: 'sprint.updated', sprint });
});

app.delete('/api/sprints/:sprintId', (req, res) => {
  const { sprintId } = req.params;
  const s = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
  if (!s || s.deleted_at) return res.status(404).json({ error: 'Sprint not found' });
  const now = new Date().toISOString();
  db.prepare('UPDATE sprints SET deleted_at = ?, state = ? WHERE id = ?').run(now, 'DELETED', sprintId);
  res.json({ id: sprintId, deletedAt: now });
  broadcast(s.board_id, { type: 'sprint.deleted', id: sprintId });
});

/**
 * Work items
 */
app.get('/api/boards/:boardId/items', (req, res) => {
  const { boardId } = req.params;
  const {
    sprintId,
    epicId,
    status,
    type,
    teamId,
    assigneeId,
    searchQuery,
  } = req.query;
  // Build dynamic where clause
  let where = 'board_id = ? AND deleted_at IS NULL';
  const params = [boardId];
  if (sprintId) {
    where += ' AND sprint_id = ?';
    params.push(sprintId);
  }
  if (epicId) {
    where += ' AND epic_id = ?';
    params.push(epicId);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (teamId) {
    where += ' AND team_id = ?';
    params.push(teamId);
  }
  if (assigneeId) {
    where += ' AND id IN (SELECT item_id FROM work_item_assignees WHERE user_id = ?)';
    params.push(assigneeId);
  }
  if (searchQuery) {
    where += ' AND (title LIKE ? OR summary LIKE ?)';
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }
  const sql = `SELECT * FROM work_items WHERE ${where}`;
  const rows = db.prepare(sql).all(...params);
  const items = rows.map((r) => mapWorkItem(r));
  res.json(items);
});

app.post('/api/boards/:boardId/items', (req, res) => {
  const { boardId } = req.params;
  const {
    title,
    summary,
    description,
    type,
    status,
    priority,
    reporterId,
    sprintId,
    group,
    stack,
    estimationPoints,
    effortHours,
    dueDate,
    labels,
    checklist,
    attachments,
    watchers,
    parentId,
    epicId,
    teamId,
    assignees,
  } = req.body;
  if (!title || !type || !status || !priority || !reporterId) {
    return res.status(400).json({ error: 'title, type, status, priority and reporterId are required' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO work_items (
      id, board_id, title, summary, description, type, status, priority, reporter_id, sprint_id,
      group_name, stack, estimation_points, effort_hours, due_date, labels, checklist, attachments,
      watchers, created_at, updated_at, version, parent_id, epic_id, team_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    boardId,
    title,
    summary || '',
    description || '',
    type,
    status,
    priority,
    reporterId,
    sprintId || null,
    group || null,
    stack || null,
    estimationPoints || 0,
    effortHours || 0,
    dueDate || null,
    JSON.stringify(labels || []),
    JSON.stringify(checklist || []),
    JSON.stringify(attachments || []),
    JSON.stringify(watchers || []),
    now,
    now,
    1,
    parentId || null,
    epicId || null,
    teamId || null
  );
  // Insert assignees
  if (assignees && assignees.length > 0) {
    const insert = db.prepare('INSERT INTO work_item_assignees (item_id, user_id, is_primary) VALUES (?, ?, ?)');
    assignees.forEach((a, idx) => {
      insert.run(id, a.userId, idx === 0 ? 1 : 0);
    });
  }
  const row = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
  const item = mapWorkItem(row);
  res.json(item);
  broadcast(boardId, { type: 'item.created', item });
});

app.get('/api/items/:itemId', (req, res) => {
  const { itemId } = req.params;
  const row = db.prepare('SELECT * FROM work_items WHERE id = ?').get(itemId);
  if (!row || row.deleted_at) return res.status(404).json({ error: 'Item not found' });
  res.json(mapWorkItem(row));
});

app.patch('/api/items/:itemId', (req, res) => {
  const { itemId } = req.params;
  const fields = req.body;
  const current = db.prepare('SELECT * FROM work_items WHERE id = ?').get(itemId);
  if (!current || current.deleted_at) return res.status(404).json({ error: 'Item not found' });
  const now = new Date().toISOString();
  const updates = [];
  const params = [];
  // Allowed fields for update
  const allowed = [
    'title',
    'summary',
    'description',
    'type',
    'status',
    'priority',
    'sprint_id',
    'group_name',
    'stack',
    'estimation_points',
    'effort_hours',
    'due_date',
    'labels',
    'checklist',
    'attachments',
    'watchers',
    'parent_id',
    'epic_id',
    'team_id',
  ];
  allowed.forEach((col) => {
    const bodyKey =
      col === 'sprint_id'
        ? 'sprintId'
        : col === 'group_name'
        ? 'group'
        : col === 'estimation_points'
        ? 'estimationPoints'
        : col === 'effort_hours'
        ? 'effortHours'
        : col === 'due_date'
        ? 'dueDate'
        : col === 'parent_id'
        ? 'parentId'
        : col === 'epic_id'
        ? 'epicId'
        : col === 'team_id'
        ? 'teamId'
        : col;
    if (fields.hasOwnProperty(bodyKey)) {
      let value = fields[bodyKey];
      if (['labels', 'checklist', 'attachments', 'watchers'].includes(col)) {
        value = JSON.stringify(value || []);
      }
      updates.push(`${col} = ?`);
      params.push(value);
    }
  });
  if (updates.length > 0) {
    params.push(now, itemId);
    const sql = `UPDATE work_items SET ${updates.join(', ')}, updated_at = ?, version = version + 1 WHERE id = ?`;
    db.prepare(sql).run(...params);
  }
  // Handle assignee updates
  if (fields.assignees) {
    db.prepare('DELETE FROM work_item_assignees WHERE item_id = ?').run(itemId);
    const insert = db.prepare('INSERT INTO work_item_assignees (item_id, user_id, is_primary) VALUES (?, ?, ?)');
    fields.assignees.forEach((a, idx) => {
      insert.run(itemId, a.userId, idx === 0 ? 1 : 0);
    });
  }
  // Handle status change: log transition
  if (fields.status && fields.status !== current.status) {
    const transitionId = uuidv4();
    db.prepare(
      `INSERT INTO work_item_transitions (id, item_id, board_id, from_status, to_status, at, actor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      transitionId,
      itemId,
      current.board_id,
      current.status,
      fields.status,
      now,
      fields.actorId || current.reporter_id
    );
    // If transitioning to DONE and no done_in_sprint_id, set done_in_sprint_id
    if (fields.status === 'Done' && !current.done_in_sprint_id) {
      db.prepare('UPDATE work_items SET done_in_sprint_id = ? WHERE id = ?').run(current.sprint_id, itemId);
    }
  }
  const updated = db.prepare('SELECT * FROM work_items WHERE id = ?').get(itemId);
  const item = mapWorkItem(updated);
  res.json(item);
  broadcast(updated.board_id, { type: 'item.updated', item });
});

app.delete('/api/items/:itemId', (req, res) => {
  const { itemId } = req.params;
  const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(itemId);
  if (!item || item.deleted_at) return res.status(404).json({ error: 'Item not found' });
  const now = new Date().toISOString();
  db.prepare('UPDATE work_items SET deleted_at = ? WHERE id = ?').run(now, itemId);
  res.json({ id: itemId, deletedAt: now });
  broadcast(item.board_id, { type: 'item.deleted', id: itemId });
});

/**
 * Comments
 */
app.post('/api/items/:itemId/comments', (req, res) => {
  const { itemId } = req.params;
  const { userId, content, mentions } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ error: 'userId and content are required' });
  }
  const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(itemId);
  if (!item || item.deleted_at) return res.status(404).json({ error: 'Item not found' });
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO comments (id, item_id, user_id, content, mentions, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, itemId, userId, content, JSON.stringify(mentions || []), now);
  const comment = {
    id,
    user: (() => {
      const u = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(userId);
      return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatar_url };
    })(),
    content,
    mentions: (mentions || []).map((m) => {
      const mu = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(m);
      return { id: mu.id, name: mu.name, email: mu.email, avatarUrl: mu.avatar_url };
    }),
    timestamp: now,
  };
  res.json(comment);
  broadcast(item.board_id, { type: 'comment.created', itemId, comment });
});

/**
 * Events (Calendar)
 */
app.get('/api/boards/:boardId/events', (req, res) => {
  const { boardId } = req.params;
  const rows = db.prepare('SELECT * FROM events WHERE board_id = ?').all(boardId);
  const events = rows.map((r) => ({
    id: r.id,
    title: r.title,
    start: r.start,
    end: r.end,
    allDay: r.all_day === 1,
    description: r.description || '',
    linkedWorkItemId: r.linked_work_item_id || undefined,
    attendees: safeParse(r.attendees, []).map((uid) => {
      const u = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(uid);
      return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatar_url };
    }),
    teamIds: [],
    createdBy: (() => {
      const cu = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(r.created_by);
      return { id: cu.id, name: cu.name, email: cu.email, avatarUrl: cu.avatar_url };
    })(),
    onlineLink: r.online_link || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  res.json(events);
});

app.post('/api/boards/:boardId/events', (req, res) => {
  const { boardId } = req.params;
  const {
    title,
    start,
    end,
    allDay,
    description,
    linkedWorkItemId,
    attendees,
    createdBy,
    onlineLink,
  } = req.body;
  if (!title || !start || !end || !createdBy) {
    return res.status(400).json({ error: 'title, start, end and createdBy are required' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO events (
      id, board_id, title, description, start, end, all_day, linked_work_item_id, attendees, created_by, online_link, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    boardId,
    title,
    description || '',
    start,
    end,
    allDay ? 1 : 0,
    linkedWorkItemId || null,
    JSON.stringify(attendees || []),
    createdBy,
    onlineLink || null,
    now,
    now
  );
  const event = {
    id,
    title,
    start,
    end,
    allDay: !!allDay,
    description: description || '',
    linkedWorkItemId: linkedWorkItemId || undefined,
    attendees: (attendees || []).map((uid) => {
      const u = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(uid);
      return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatar_url };
    }),
    teamIds: [],
    createdBy: (() => {
      const cu = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(createdBy);
      return { id: cu.id, name: cu.name, email: cu.email, avatarUrl: cu.avatar_url };
    })(),
    onlineLink: onlineLink || undefined,
    createdAt: now,
    updatedAt: now,
  };
  res.json(event);
  broadcast(boardId, { type: 'event.created', event });
});

app.get('/api/events/:eventId', (req, res) => {
  const { eventId } = req.params;
  const r = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!r) return res.status(404).json({ error: 'Event not found' });
  const event = {
    id: r.id,
    title: r.title,
    start: r.start,
    end: r.end,
    allDay: r.all_day === 1,
    description: r.description || '',
    linkedWorkItemId: r.linked_work_item_id || undefined,
    attendees: safeParse(r.attendees, []).map((uid) => {
      const u = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(uid);
      return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatar_url };
    }),
    teamIds: [],
    createdBy: (() => {
      const cu = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(r.created_by);
      return { id: cu.id, name: cu.name, email: cu.email, avatarUrl: cu.avatar_url };
    })(),
    onlineLink: r.online_link || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
  res.json(event);
});

app.patch('/api/events/:eventId', (req, res) => {
  const { eventId } = req.params;
  const fields = req.body;
  const current = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!current) return res.status(404).json({ error: 'Event not found' });
  const now = new Date().toISOString();
  const updates = [];
  const params = [];
  const allowed = [
    'title',
    'description',
    'start',
    'end',
    'all_day',
    'linked_work_item_id',
    'attendees',
    'online_link',
  ];
  allowed.forEach((col) => {
    const bodyKey =
      col === 'all_day' ? 'allDay' : col === 'linked_work_item_id' ? 'linkedWorkItemId' : col === 'online_link' ? 'onlineLink' : col;
    if (fields.hasOwnProperty(bodyKey)) {
      let val = fields[bodyKey];
      if (col === 'attendees') {
        val = JSON.stringify(val || []);
      }
      if (col === 'all_day') {
        val = fields[bodyKey] ? 1 : 0;
      }
      updates.push(`${col} = ?`);
      params.push(val);
    }
  });
  if (updates.length > 0) {
    params.push(now, eventId);
    const sql = `UPDATE events SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`;
    db.prepare(sql).run(...params);
  }
  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  const event = {
    id: updated.id,
    title: updated.title,
    start: updated.start,
    end: updated.end,
    allDay: updated.all_day === 1,
    description: updated.description || '',
    linkedWorkItemId: updated.linked_work_item_id || undefined,
    attendees: safeParse(updated.attendees, []).map((uid) => {
      const u = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(uid);
      return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatar_url };
    }),
    teamIds: [],
    createdBy: (() => {
      const cu = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(updated.created_by);
      return { id: cu.id, name: cu.name, email: cu.email, avatarUrl: cu.avatar_url };
    })(),
    onlineLink: updated.online_link || undefined,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
  res.json(event);
  broadcast(updated.board_id, { type: 'event.updated', event });
});

app.delete('/api/events/:eventId', (req, res) => {
  const { eventId } = req.params;
  const r = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!r) return res.status(404).json({ error: 'Event not found' });
  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  res.json({ id: eventId });
  broadcast(r.board_id, { type: 'event.deleted', id: eventId });
});

/**
 * Reports
 */
// Burndown report: calculates remaining estimation points each day of a sprint
app.get('/api/reports/burndown', (req, res) => {
  const { sprintId } = req.query;
  if (!sprintId) return res.status(400).json({ error: 'sprintId is required' });
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
  if (!sprint || sprint.deleted_at) return res.status(404).json({ error: 'Sprint not found' });
  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  // Collect items in this sprint
  const items = db
    .prepare('SELECT id, estimation_points, status, sprint_id, done_in_sprint_id FROM work_items WHERE sprint_id = ? AND deleted_at IS NULL')
    .all(sprintId);
  // Build list of days
  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const totalPoints = items.reduce((sum, item) => sum + (item.estimation_points || 0), 0);
  const ideal = days.map((_, idx) => {
    return totalPoints - (idx * totalPoints) / (days.length - 1);
  });
  // Actual remaining: subtract points when items are marked done on a given day
  const transitions = db
    .prepare(
      `SELECT item_id, from_status, to_status, at
       FROM work_item_transitions
       WHERE board_id = ? AND item_id IN (${items.map(() => '?').join(',')}) AND to_status = 'Done'`
    )
    .all(sprint.board_id, ...items.map((i) => i.id));
  const doneByDay = new Map();
  transitions.forEach((t) => {
    const date = new Date(t.at);
    const dayIndex = Math.floor((date - startDate) / (24 * 3600 * 1000));
    const points = items.find((i) => i.id === t.item_id).estimation_points || 0;
    doneByDay.set(dayIndex, (doneByDay.get(dayIndex) || 0) + points);
  });
  const remaining = [];
  let pointsLeft = totalPoints;
  for (let i = 0; i < days.length; i++) {
    const done = doneByDay.get(i) || 0;
    pointsLeft -= done;
    remaining.push(Math.max(pointsLeft, 0));
  }
  res.json({
    labels: days.map((d) => d.toISOString().slice(0, 10)),
    ideal,
    actual: remaining,
  });
});

// Velocity report: sums estimation points of DONE items per closed sprint for the last 6 sprints
app.get('/api/reports/velocity', (req, res) => {
  const { boardId, window } = req.query;
  if (!boardId) return res.status(400).json({ error: 'boardId is required' });
  const win = parseInt(window) || 6;
  // Get closed sprints sorted by end date desc
  const sprints = db
    .prepare(
      `SELECT * FROM sprints WHERE board_id = ? AND state = 'CLOSED' AND deleted_at IS NULL ORDER BY end_date DESC LIMIT ?`
    )
    .all(boardId, win);
  const results = sprints.map((s) => {
    const items = db
      .prepare(
        `SELECT estimation_points FROM work_items WHERE done_in_sprint_id = ? AND deleted_at IS NULL`
      )
      .all(s.id);
    const points = items.reduce((sum, i) => sum + (i.estimation_points || 0), 0);
    return { sprintId: s.id, name: s.name, endAt: s.end_date, points };
  });
  res.json({ sprints: results });
});

// Epic progress report: summarises done vs total estimation per epic for a board
app.get('/api/reports/epic_progress', (req, res) => {
  const { boardId } = req.query;
  if (!boardId) return res.status(400).json({ error: 'boardId is required' });
  const epics = db
    .prepare('SELECT * FROM epics WHERE board_id = ? AND deleted_at IS NULL')
    .all(boardId);
  const report = epics.map((e) => {
    const items = db
      .prepare('SELECT estimation_points, status FROM work_items WHERE epic_id = ? AND deleted_at IS NULL')
      .all(e.id);
    const totalEst = items.reduce((sum, i) => sum + (i.estimation_points || 0), 0);
    const doneEst = items.filter((i) => i.status === 'Done').reduce((sum, i) => sum + (i.estimation_points || 0), 0);
    const totalItems = items.length;
    const doneItems = items.filter((i) => i.status === 'Done').length;
    const progress = totalEst > 0 ? doneEst / totalEst : 0;
    return {
      epic: {
        id: e.id,
        boardId: e.board_id,
        name: e.name,
        aiSummary: e.summary || '',
        description: e.description || '',
        attachments: [],
        ease: e.ice_ease,
        impact: e.ice_impact,
        confidence: e.ice_confidence,
        iceScore: e.ice_impact + e.ice_confidence + e.ice_ease,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        color: e.color || '#CCCCCC',
        status: e.status,
        archivedAt: null,
        deletedAt: e.deleted_at,
      },
      totalItems,
      doneItems,
      totalEstimation: totalEst,
      doneEstimation: doneEst,
      progress,
    };
  });
  res.json(report);
});

// Assignee workload: counts open/in‑progress/in‑review items and total load per assignee
app.get('/api/reports/assignee_workload', (req, res) => {
  const { boardId } = req.query;
  if (!boardId) return res.status(400).json({ error: 'boardId is required' });
  // Get all users assigned to items in this board
  const users = db
    .prepare(
      `SELECT DISTINCT ua.user_id FROM work_item_assignees ua
       JOIN work_items wi ON wi.id = ua.item_id
       WHERE wi.board_id = ? AND wi.deleted_at IS NULL`
    )
    .all(boardId);
  const workload = users.map(({ user_id }) => {
    const user = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(user_id);
    const items = db
      .prepare(
        `SELECT status, estimation_points FROM work_items wi
         JOIN work_item_assignees ua ON wi.id = ua.item_id
         WHERE wi.board_id = ? AND ua.user_id = ? AND wi.deleted_at IS NULL`
      )
      .all(boardId, user_id);
    let open = 0;
    let inProgress = 0;
    let inReview = 0;
    let totalLoad = 0;
    items.forEach((it) => {
      totalLoad += it.estimation_points || 0;
      if (it.status === 'Backlog' || it.status === 'To Do') open++;
      else if (it.status === 'In Progress') inProgress++;
      else if (it.status === 'In Review') inReview++;
    });
    // Example WIP limit: 5 in progress
    const wipBreached = inProgress > 5;
    return {
      assignee: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url },
      open,
      inProgress,
      inReview,
      totalLoad,
      wipBreached,
    };
  });
  res.json(workload);
});

// Start the server
server.listen(PORT, () => {
  console.log(`ScrumOwl API server listening on port ${PORT}`);
});
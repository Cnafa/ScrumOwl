const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { db, initialize } = require('./db');

// Initialize database and seed roles
initialize();

const app = express();
app.use(cors());
app.use(express.json());

// Helper to wrap responses and handle errors
function respond(res, fn) {
  try {
    const result = fn();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

// -------------------- Users --------------------
// Create or update user (upsert) when logging in via Google or other SSO
app.post('/api/users', (req, res) => {
  respond(res, () => {
    const { id, name, email, avatarUrl } = req.body;
    if (!id || !name || !email) {
      throw new Error('id, name and email are required');
    }
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (existing) {
      db.prepare('UPDATE users SET name=?, email=?, avatar_url=? WHERE id=?').run(name, email, avatarUrl || null, id);
    } else {
      db.prepare('INSERT INTO users (id, name, email, avatar_url) VALUES (?,?,?,?)').run(id, name, email, avatarUrl || null);
    }
    return { id, name, email, avatarUrl };
  });
});

// -------------------- Boards --------------------
app.get('/api/boards', (req, res) => {
  respond(res, () => {
    const rows = db.prepare('SELECT * FROM boards').all();
    return rows;
  });
});

app.post('/api/boards', (req, res) => {
  respond(res, () => {
    const { name } = req.body;
    if (!name) throw new Error('name is required');
    const id = uuidv4();
    db.prepare('INSERT INTO boards (id, name) VALUES (?,?)').run(id, name);
    // Optionally add the creator as Scrum Master; expects userId and role
    const { userId, roleId = 'SCRUM_MASTER' } = req.body;
    if (userId) {
      db.prepare('INSERT INTO board_members (board_id, user_id, role_id) VALUES (?,?,?)').run(id, userId, roleId);
    }
    return { id, name };
  });
});

// -------------------- Board Members --------------------
app.get('/api/boards/:boardId/members', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const rows = db.prepare(`SELECT bm.user_id, bm.role_id, u.name, u.email, u.avatar_url, r.name AS role_name, r.permissions
                             FROM board_members bm
                             JOIN users u ON bm.user_id = u.id
                             JOIN roles r ON bm.role_id = r.id
                             WHERE bm.board_id = ?`).all(boardId);
    return rows.map(row => ({
      user: { id: row.user_id, name: row.name, email: row.email, avatarUrl: row.avatar_url },
      role: { id: row.role_id, name: row.role_name, permissions: JSON.parse(row.permissions) }
    }));
  });
});

app.post('/api/boards/:boardId/members', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const { userId, roleId } = req.body;
    if (!userId || !roleId) throw new Error('userId and roleId required');
    db.prepare('INSERT OR REPLACE INTO board_members (board_id, user_id, role_id) VALUES (?,?,?)').run(boardId, userId, roleId);
    return { boardId, userId, roleId };
  });
});

// -------------------- Teams --------------------
app.get('/api/boards/:boardId/teams', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const rows = db.prepare('SELECT * FROM teams WHERE board_id = ?').all(boardId);
    return rows;
  });
});

app.post('/api/boards/:boardId/teams', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const { name, description } = req.body;
    if (!name) throw new Error('name required');
    const id = uuidv4();
    db.prepare('INSERT INTO teams (id, board_id, name, description) VALUES (?,?,?,?)').run(id, boardId, name, description || null);
    return { id, boardId, name, description };
  });
});

app.post('/api/teams/:teamId/members', (req, res) => {
  respond(res, () => {
    const teamId = req.params.teamId;
    const { userId } = req.body;
    if (!userId) throw new Error('userId required');
    db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?,?)').run(teamId, userId);
    return { teamId, userId };
  });
});

app.delete('/api/teams/:teamId/members/:userId', (req, res) => {
  respond(res, () => {
    const { teamId, userId } = req.params;
    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, userId);
    return { teamId, userId };
  });
});

// -------------------- Epics --------------------
app.get('/api/boards/:boardId/epics', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const rows = db.prepare('SELECT * FROM epics WHERE board_id = ? AND deleted_at IS NULL').all(boardId);
    return rows.map(epic => ({
      ...epic,
      attachments: epic.attachments ? JSON.parse(epic.attachments) : [],
    }));
  });
});

app.post('/api/boards/:boardId/epics', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const { name, aiSummary = '', description = '', attachments = [], ease = 0, impact = 0, confidence = 0, color = '#888888' } = req.body;
    if (!name) throw new Error('name required');
    const id = uuidv4();
    const iceScore = ((ease + impact + confidence) / 3).toFixed(2);
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO epics (id, board_id, name, ai_summary, description, attachments, ease, impact, confidence, ice_score, created_at, updated_at, color, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, boardId, name, aiSummary, description, JSON.stringify(attachments), ease, impact, confidence, iceScore, now, now, color, 'ACTIVE'
    );
    return { id, boardId, name, aiSummary, description, attachments, ease, impact, confidence, iceScore: parseFloat(iceScore), color, status: 'ACTIVE', createdAt: now, updatedAt: now };
  });
});

app.get('/api/epics/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const epic = db.prepare('SELECT * FROM epics WHERE id = ?').get(id);
    if (!epic) throw new Error('Epic not found');
    return { ...epic, attachments: epic.attachments ? JSON.parse(epic.attachments) : [] };
  });
});

app.patch('/api/epics/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const epic = db.prepare('SELECT * FROM epics WHERE id = ?').get(id);
    if (!epic) throw new Error('Epic not found');
    const fields = ['name','aiSummary','description','attachments','ease','impact','confidence','color','status','archivedAt','deletedAt'];
    const updates = [];
    const now = new Date().toISOString();
    fields.forEach(f => {
      const key = f[0].toLowerCase() + f.slice(1);
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === 'attachments') {
          updates.push({ key: 'attachments', value: JSON.stringify(req.body[key]) });
        } else if (key === 'archivedAt') {
          updates.push({ key: 'archived_at', value: req.body[key] });
        } else if (key === 'deletedAt') {
          updates.push({ key: 'deleted_at', value: req.body[key] });
        } else {
          // field names map to column names (mostly same but convert camelCase to snake_case if needed)
          const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updates.push({ key: col, value: req.body[key] });
        }
      }
    });
    // Recalculate iceScore if any of ease/impact/confidence changed
    let ease = epic.ease;
    let impact = epic.impact;
    let confidence = epic.confidence;
    if (Object.prototype.hasOwnProperty.call(req.body, 'ease')) ease = req.body.ease;
    if (Object.prototype.hasOwnProperty.call(req.body, 'impact')) impact = req.body.impact;
    if (Object.prototype.hasOwnProperty.call(req.body, 'confidence')) confidence = req.body.confidence;
    const iceScore = ((Number(ease) + Number(impact) + Number(confidence)) / 3).toFixed(2);
    updates.push({ key: 'ice_score', value: iceScore });
    updates.push({ key: 'updated_at', value: now });
    // Build query
    const setStr = updates.map(u => `${u.key} = ?`).join(', ');
    const params = updates.map(u => u.value);
    params.push(id);
    db.prepare(`UPDATE epics SET ${setStr} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM epics WHERE id = ?').get(id);
    return { ...updated, attachments: updated.attachments ? JSON.parse(updated.attachments) : [] };
  });
});

app.delete('/api/epics/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    // Soft delete: set deleted_at
    const now = new Date().toISOString();
    db.prepare('UPDATE epics SET deleted_at = ? WHERE id = ?').run(now, id);
    return { id, deletedAt: now };
  });
});

// Change epic status
app.post('/api/epics/:id/status', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const { status } = req.body;
    if (!status) throw new Error('status required');
    const now = new Date().toISOString();
    db.prepare('UPDATE epics SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    return { id, status, updatedAt: now };
  });
});

// -------------------- Sprints --------------------
app.get('/api/boards/:boardId/sprints', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const rows = db.prepare('SELECT * FROM sprints WHERE board_id = ? AND deleted_at IS NULL').all(boardId);
    return rows.map(s => ({ ...s }));
  });
});

app.post('/api/boards/:boardId/sprints', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const { number, name, goal = null, startAt, endAt } = req.body;
    if (number == null || !name || !startAt || !endAt) throw new Error('number, name, startAt, endAt required');
    const id = uuidv4();
    db.prepare('INSERT INTO sprints (id, board_id, number, name, goal, start_at, end_at, state) VALUES (?,?,?,?,?,?,?,?)').run(
      id, boardId, number, name, goal, startAt, endAt, 'PLANNED'
    );
    return { id, boardId, number, name, goal, startAt, endAt, state: 'PLANNED' };
  });
});

app.get('/api/sprints/:id', (req, res) => {
  respond(res, () => {
    const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id);
    if (!sprint) throw new Error('Sprint not found');
    return sprint;
  });
});

app.patch('/api/sprints/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(id);
    if (!sprint) throw new Error('Sprint not found');
    const allowed = ['number','name','goal','startAt','endAt','state','deletedAt'];
    const updates = [];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        let col;
        if (key === 'startAt') col = 'start_at';
        else if (key === 'endAt') col = 'end_at';
        else if (key === 'deletedAt') col = 'deleted_at';
        else col = key;
        updates.push({ key: col, value: req.body[key] });
      }
    });
    if (updates.length === 0) return sprint;
    const setStr = updates.map(u => `${u.key} = ?`).join(', ');
    const params = updates.map(u => u.value);
    params.push(id);
    db.prepare(`UPDATE sprints SET ${setStr} WHERE id = ?`).run(...params);
    return db.prepare('SELECT * FROM sprints WHERE id = ?').get(id);
  });
});

app.delete('/api/sprints/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const now = new Date().toISOString();
    db.prepare('UPDATE sprints SET deleted_at = ? WHERE id = ?').run(now, id);
    return { id, deletedAt: now };
  });
});

// Assign epics to sprint
app.post('/api/sprints/:id/epics', (req, res) => {
  respond(res, () => {
    const sprintId = req.params.id;
    const { epicIds } = req.body;
    if (!Array.isArray(epicIds)) throw new Error('epicIds must be array');
    const insert = db.prepare('INSERT OR IGNORE INTO sprint_epics (sprint_id, epic_id) VALUES (?,?)');
    const delStmt = db.prepare('DELETE FROM sprint_epics WHERE sprint_id = ?');
    // Remove existing and add all new
    const tx = db.transaction(() => {
      delStmt.run(sprintId);
      for (const epicId of epicIds) insert.run(sprintId, epicId);
    });
    tx();
    return { sprintId, epicIds };
  });
});

// -------------------- Work Items --------------------
// List items for board with basic filters
app.get('/api/boards/:boardId/items', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const { epicId, sprintId, assigneeId, teamId, status } = req.query;
    let query = 'SELECT * FROM work_items WHERE board_id = ?';
    const params = [boardId];
    if (epicId) { query += ' AND epic_id = ?'; params.push(epicId); }
    if (sprintId) { query += ' AND sprint_id = ?'; params.push(sprintId); }
    if (assigneeId) { query += ' AND assignee_id = ?'; params.push(assigneeId); }
    if (teamId) { query += ' AND team_id = ?'; params.push(teamId); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    const rows = db.prepare(query).all(...params);
    return rows.map(item => ({
      ...item,
      labels: item.labels ? JSON.parse(item.labels) : [],
      attachments: item.attachments ? JSON.parse(item.attachments) : [],
      watchers: item.watchers ? JSON.parse(item.watchers) : [],
    }));
  });
});

app.post('/api/boards/:boardId/items', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const body = req.body;
    const required = ['title','summary','description','type','status','priority','estimationPoints','effortHours','dueDate','reporterId'];
    for (const r of required) {
      if (!Object.prototype.hasOwnProperty.call(body, r)) {
        throw new Error(`${r} is required`);
      }
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const assigneeId = body.assigneeId || null;
    db.prepare(`INSERT INTO work_items (
      id, board_id, title, summary, description, type, status, assignee_id, priority,
      estimation_points, effort_hours, due_date, group_name, stack, sprint_id, created_at, updated_at, version,
      reporter_id, epic_id, team_id, labels, attachments, watchers, parent_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, boardId, body.title, body.summary, body.description, body.type, body.status, assigneeId,
      body.priority, body.estimationPoints, body.effortHours, body.dueDate, body.group || null, body.stack || null,
      body.sprintId || null, now, now, 1, body.reporterId, body.epicId || null, body.teamId || null,
      JSON.stringify(body.labels || []), JSON.stringify(body.attachments || []), JSON.stringify(body.watchers || []), body.parentId || null
    );
    // Insert into work_item_assignees for multi assignees
    const tx = db.transaction(() => {
      if (body.assignees && Array.isArray(body.assignees)) {
        for (const ass of body.assignees) {
          const isPrimary = (ass.id === assigneeId) ? 1 : 0;
          db.prepare('INSERT INTO work_item_assignees (item_id, user_id, is_primary) VALUES (?,?,?)').run(id, ass.id, isPrimary);
        }
      } else if (assigneeId) {
        db.prepare('INSERT INTO work_item_assignees (item_id, user_id, is_primary) VALUES (?,?,1)').run(id, assigneeId);
      }
      // Add transition log for initial status as null->status
      db.prepare('INSERT INTO work_item_transition (id,item_id,from_status,to_status,at,by_user_id) VALUES (?,?,?,?,?,?)')
        .run(uuidv4(), id, null, body.status, now, body.reporterId);
    });
    tx();
    return { id, boardId, ...body, assigneeId, createdAt: now, updatedAt: now, version: 1 };
  });
});

app.get('/api/items/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
    if (!item) throw new Error('Item not found');
    return {
      ...item,
      labels: item.labels ? JSON.parse(item.labels) : [],
      attachments: item.attachments ? JSON.parse(item.attachments) : [],
      watchers: item.watchers ? JSON.parse(item.watchers) : [],
    };
  });
});

app.patch('/api/items/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
    if (!item) throw new Error('Item not found');
    const updates = [];
    const fieldsMap = {
      title: 'title',
      summary: 'summary',
      description: 'description',
      type: 'type',
      status: 'status',
      assigneeId: 'assignee_id',
      priority: 'priority',
      estimationPoints: 'estimation_points',
      effortHours: 'effort_hours',
      dueDate: 'due_date',
      group: 'group_name',
      stack: 'stack',
      sprintId: 'sprint_id',
      reporterId: 'reporter_id',
      epicId: 'epic_id',
      teamId: 'team_id',
      labels: 'labels',
      attachments: 'attachments',
      watchers: 'watchers',
      parentId: 'parent_id'
    };
    let newStatus = null;
    let now = new Date().toISOString();
    for (const key in fieldsMap) {
      if (req.body[key] !== undefined) {
        const col = fieldsMap[key];
        let val = req.body[key];
        if (key === 'labels' || key === 'attachments' || key === 'watchers') {
          val = JSON.stringify(val);
        }
        updates.push({ key: col, value: val });
        if (key === 'status') newStatus = val;
      }
    }
    // update updated_at and increment version
    updates.push({ key: 'updated_at', value: now });
    updates.push({ key: 'version', value: item.version + 1 });
    // Build query
    const setStr = updates.map(u => `${u.key} = ?`).join(', ');
    const params = updates.map(u => u.value);
    params.push(id);
    db.prepare(`UPDATE work_items SET ${setStr} WHERE id = ?`).run(...params);
    // Update assignees if provided
    if (req.body.assignees) {
      const assignees = req.body.assignees;
      db.transaction(() => {
        db.prepare('DELETE FROM work_item_assignees WHERE item_id = ?').run(id);
        if (Array.isArray(assignees)) {
          for (const ass of assignees) {
            const isPrimary = ass.isPrimary ? 1 : (ass.id === req.body.assigneeId ? 1 : 0);
            db.prepare('INSERT INTO work_item_assignees (item_id, user_id, is_primary) VALUES (?,?,?)').run(id, ass.id, isPrimary);
          }
        }
      })();
    }
    // If status changed, log transition
    if (newStatus && newStatus !== item.status) {
      db.prepare('INSERT INTO work_item_transition (id,item_id,from_status,to_status,at,by_user_id) VALUES (?,?,?,?,?,?)')
        .run(uuidv4(), id, item.status, newStatus, now, req.body.actorId || req.body.assigneeId || item.reporter_id);
    }
    return db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
  });
});

app.delete('/api/items/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    db.prepare('DELETE FROM work_items WHERE id = ?').run(id);
    db.prepare('DELETE FROM work_item_assignees WHERE item_id = ?').run(id);
    db.prepare('DELETE FROM checklist_items WHERE item_id = ?').run(id);
    db.prepare('DELETE FROM comments WHERE item_id = ?').run(id);
    db.prepare('DELETE FROM work_item_transition WHERE item_id = ?').run(id);
    return { id };
  });
});

// Checklist items
app.post('/api/items/:id/checklist', (req, res) => {
  respond(res, () => {
    const itemId = req.params.id;
    const { text } = req.body;
    if (!text) throw new Error('text required');
    const id = uuidv4();
    db.prepare('INSERT INTO checklist_items (id, item_id, text, is_completed) VALUES (?,?,?,0)').run(id, itemId, text);
    return { id, itemId, text, isCompleted: false };
  });
});

app.patch('/api/checklist/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const { text, isCompleted } = req.body;
    const updates = [];
    if (text !== undefined) updates.push({ key: 'text', value: text });
    if (isCompleted !== undefined) updates.push({ key: 'is_completed', value: isCompleted ? 1 : 0 });
    if (updates.length === 0) throw new Error('no updates');
    const setStr = updates.map(u => `${u.key} = ?`).join(', ');
    const params = updates.map(u => u.value);
    params.push(id);
    db.prepare(`UPDATE checklist_items SET ${setStr} WHERE id = ?`).run(...params);
    return db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(id);
  });
});

app.delete('/api/checklist/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    db.prepare('DELETE FROM checklist_items WHERE id = ?').run(id);
    return { id };
  });
});

// Comments
app.get('/api/items/:id/comments', (req, res) => {
  respond(res, () => {
    const itemId = req.params.id;
    const rows = db.prepare('SELECT c.*, u.name, u.email, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.id WHERE item_id = ? ORDER BY timestamp ASC').all(itemId);
    return rows.map(row => ({
      id: row.id,
      user: { id: row.user_id, name: row.name, email: row.email, avatarUrl: row.avatar_url },
      content: row.content,
      mentions: row.mentions ? JSON.parse(row.mentions) : [],
      timestamp: row.timestamp
    }));
  });
});

app.post('/api/items/:id/comments', (req, res) => {
  respond(res, () => {
    const itemId = req.params.id;
    const { userId, content, mentions = [] } = req.body;
    if (!userId || !content) throw new Error('userId and content required');
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    db.prepare('INSERT INTO comments (id, item_id, user_id, content, mentions, timestamp) VALUES (?,?,?,?,?,?)')
      .run(id, itemId, userId, content, JSON.stringify(mentions), timestamp);
    return { id, itemId, userId, content, mentions, timestamp };
  });
});

// Activity (transitions and comments)
app.get('/api/items/:id/activity', (req, res) => {
  respond(res, () => {
    const itemId = req.params.id;
    const comments = db.prepare('SELECT c.*, u.name, u.email, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.item_id = ?').all(itemId).map(row => ({ type: 'COMMENT', data: { id: row.id, user: { id: row.user_id, name: row.name, email: row.email, avatarUrl: row.avatar_url }, content: row.content, mentions: row.mentions ? JSON.parse(row.mentions) : [], timestamp: row.timestamp } }));
    const transitions = db.prepare('SELECT t.*, u.name, u.email, u.avatar_url FROM work_item_transition t JOIN users u ON t.by_user_id = u.id WHERE t.item_id = ?').all(itemId).map(row => ({ type: 'TRANSITION', data: { id: row.id, user: { id: row.by_user_id, name: row.name, email: row.email, avatarUrl: row.avatar_url }, fromStatus: row.from_status, toStatus: row.to_status, timestamp: row.at } }));
    const combined = [...comments, ...transitions];
    // sort by timestamp
    combined.sort((a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime());
    return combined;
  });
});

// -------------------- Events --------------------
app.get('/api/boards/:boardId/events', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const rows = db.prepare('SELECT * FROM events WHERE board_id = ?').all(boardId);
    return rows.map(ev => ({
      ...ev,
      attendees: ev.attendees ? JSON.parse(ev.attendees) : [],
      allDay: ev.all_day === 1
    }));
  });
});

app.post('/api/boards/:boardId/events', (req, res) => {
  respond(res, () => {
    const boardId = req.params.boardId;
    const { title, start, end, allDay = false, description = '', linkedWorkItemId = null, attendees = [], createdBy, onlineLink = null } = req.body;
    if (!title || !start || !end || !createdBy) throw new Error('title, start, end, createdBy required');
    const id = uuidv4();
    db.prepare('INSERT INTO events (id, board_id, title, start, end, all_day, description, linked_work_item_id, attendees, created_by, online_link) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, boardId, title, start, end, allDay ? 1 : 0, description, linkedWorkItemId, JSON.stringify(attendees), createdBy, onlineLink);
    return { id, boardId, title, start, end, allDay, description, linkedWorkItemId, attendees, createdBy, onlineLink };
  });
});

app.get('/api/events/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!ev) throw new Error('Event not found');
    return { ...ev, attendees: ev.attendees ? JSON.parse(ev.attendees) : [], allDay: ev.all_day === 1 };
  });
});

app.patch('/api/events/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!ev) throw new Error('Event not found');
    const allowed = ['title','start','end','allDay','description','linkedWorkItemId','attendees','onlineLink'];
    const updates = [];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        let col;
        if (key === 'allDay') col = 'all_day';
        else if (key === 'linkedWorkItemId') col = 'linked_work_item_id';
        else if (key === 'onlineLink') col = 'online_link';
        else col = key;
        let val = req.body[key];
        if (key === 'attendees') val = JSON.stringify(val);
        if (key === 'allDay') val = req.body[key] ? 1 : 0;
        updates.push({ key: col, value: val });
      }
    });
    if (updates.length === 0) return ev;
    const setStr = updates.map(u => `${u.key} = ?`).join(', ');
    const params = updates.map(u => u.value);
    params.push(id);
    db.prepare(`UPDATE events SET ${setStr} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return { ...updated, attendees: updated.attendees ? JSON.parse(updated.attendees) : [], allDay: updated.all_day === 1 };
  });
});

app.delete('/api/events/:id', (req, res) => {
  respond(res, () => {
    const id = req.params.id;
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    return { id };
  });
});

// -------------------- Reports --------------------
// Burndown: compute remaining estimation over days in sprint.
app.get('/api/reports/burndown', (req, res) => {
  respond(res, () => {
    const { sprintId } = req.query;
    if (!sprintId) throw new Error('sprintId required');
    const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
    if (!sprint) throw new Error('Sprint not found');
    // Determine days between start and end inclusive
    const startDate = new Date(sprint.start_at);
    const endDate = new Date(sprint.end_at);
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    // Total points of items assigned to this sprint
    const totalPoints = db.prepare('SELECT SUM(estimation_points) AS total FROM work_items WHERE sprint_id = ?').get(sprintId).total || 0;
    // Ideal line points: linear decline
    const ideal = days.map((_, idx) => totalPoints - idx * (totalPoints / (days.length - 1)));
    // Actual: for each day, compute remaining points not done yet
    // We'll fetch transitions to DONE
    const transitions = db.prepare('SELECT * FROM work_item_transition WHERE item_id IN (SELECT id FROM work_items WHERE sprint_id = ?) AND to_status = ? ORDER BY at ASC').all(sprintId, 'Done');
    // Map of item done date to their points
    const itemPoints = {};
    const items = db.prepare('SELECT id, estimation_points FROM work_items WHERE sprint_id = ?').all(sprintId);
    for (const row of items) {
      itemPoints[row.id] = row.estimation_points;
    }
    // For each day, subtract points that have transitioned to Done by that date
    let remaining = totalPoints;
    const actual = days.map(day => {
      const dayISO = day.toISOString();
      const completed = transitions.filter(tr => new Date(tr.at) <= new Date(dayISO));
      let completedPoints = 0;
      for (const tr of completed) {
        if (itemPoints[tr.item_id]) {
          completedPoints += itemPoints[tr.item_id];
          delete itemPoints[tr.item_id];
        }
      }
      remaining = Math.max(remaining - completedPoints, 0);
      return remaining;
    });
    return {
      sprint: { id: sprint.id, name: sprint.name, startAt: sprint.start_at, endAt: sprint.end_at },
      labels: days.map(d => d.toISOString().split('T')[0]),
      ideal,
      actual,
      totalPoints
    };
  });
});

// Velocity: sum of estimation points done per sprint for last N sprints of board
app.get('/api/reports/velocity', (req, res) => {
  respond(res, () => {
    const { boardId, window = 6 } = req.query;
    if (!boardId) throw new Error('boardId required');
    const win = parseInt(window);
    // Fetch last N closed sprints ordered by number descending
    const sprints = db.prepare('SELECT * FROM sprints WHERE board_id = ? AND state = ? ORDER BY number DESC LIMIT ?').all(boardId, 'CLOSED', win);
    const result = [];
    for (const sp of sprints) {
      // Items done in this sprint: where done transition occurred and doneInSprintId = sp.id or just sprint_id? We'll approximate: use transition to Done with item sprint_id
      const doneItems = db.prepare('SELECT DISTINCT item_id FROM work_item_transition WHERE to_status = ? AND item_id IN (SELECT id FROM work_items WHERE sprint_id = ?)').all('Done', sp.id);
      let total = 0;
      for (const row of doneItems) {
        const item = db.prepare('SELECT estimation_points FROM work_items WHERE id = ?').get(row.item_id);
        if (item) total += item.estimation_points;
      }
      result.push({ sprintNumber: sp.number, sprintName: sp.name, points: total });
    }
    result.reverse();
    const avg = result.length > 0 ? result.reduce((sum, r) => sum + r.points, 0) / result.length : 0;
    return { sprints: result, average: avg };
  });
});

// Epic progress
app.get('/api/reports/epics', (req, res) => {
  respond(res, () => {
    const { boardId } = req.query;
    if (!boardId) throw new Error('boardId required');
    const epics = db.prepare('SELECT * FROM epics WHERE board_id = ? AND deleted_at IS NULL').all(boardId);
    const result = [];
    for (const epic of epics) {
      const items = db.prepare('SELECT id, estimation_points, status FROM work_items WHERE epic_id = ?').all(epic.id);
      let totalEst = 0;
      let doneEst = 0;
      let totalItems = 0;
      let doneItems = 0;
      for (const it of items) {
        totalItems += 1;
        totalEst += it.estimation_points;
        if (it.status === 'Done') {
          doneItems += 1;
          doneEst += it.estimation_points;
        }
      }
      const progress = totalEst > 0 ? (doneEst / totalEst) * 100 : 0;
      result.push({ epic: epic, totalItems, doneItems, totalEstimation: totalEst, doneEstimation: doneEst, progress: parseFloat(progress.toFixed(2)) });
    }
    return result;
  });
});

// Assignee workload
app.get('/api/reports/workload', (req, res) => {
  respond(res, () => {
    const { boardId } = req.query;
    if (!boardId) throw new Error('boardId required');
    // For each assignee, count items by status
    const items = db.prepare('SELECT * FROM work_items WHERE board_id = ?').all(boardId);
    const map = {};
    for (const it of items) {
      const assigneeId = it.assignee_id;
      if (!assigneeId) continue;
      if (!map[assigneeId]) map[assigneeId] = { open: 0, inProgress: 0, inReview: 0, totalLoad: 0 };
      if (it.status === 'Backlog' || it.status === 'To Do') map[assigneeId].open += 1;
      else if (it.status === 'In Progress') map[assigneeId].inProgress += 1;
      else if (it.status === 'In Review') map[assigneeId].inReview += 1;
      map[assigneeId].totalLoad += it.estimation_points;
    }
    // Build output including user info
    const result = [];
    for (const uid of Object.keys(map)) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
      if (!user) continue;
      result.push({ assignee: user, ...map[uid], wipBreached: map[uid].inProgress > 3 });
    }
    return result;
  });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 30200;
app.listen(PORT, () => {
  console.log(`ScrumOwl backend listening on port ${PORT}`);
});
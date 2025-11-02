// db.js
// Database initialization and helper methods using better-sqlite3.
const Database = require('better-sqlite3');
const path = require('path');

// Initialize the database. This will create the file if it doesn't exist.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(dbPath);

// Helper function to run a series of statements in a transaction
function runMigrations() {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar_url TEXT
    );`,
    // Roles table
    `CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      permissions TEXT NOT NULL
    );`,
    // Boards
    `CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );`,
    // Board members
    `CREATE TABLE IF NOT EXISTS board_members (
      board_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (board_id, user_id),
      FOREIGN KEY (board_id) REFERENCES boards(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );`,
    // Teams
    `CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id)
    );`,
    // Team members
    `CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    // Epics
    `CREATE TABLE IF NOT EXISTS epics (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      ai_summary TEXT,
      description TEXT,
      attachments TEXT,
      ease INTEGER,
      impact INTEGER,
      confidence INTEGER,
      ice_score REAL,
      created_at TEXT,
      updated_at TEXT,
      color TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      archived_at TEXT,
      deleted_at TEXT,
      open_items_count INTEGER,
      total_items_count INTEGER,
      FOREIGN KEY (board_id) REFERENCES boards(id)
    );`,
    // Sprints
    `CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      goal TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      state TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id)
    );`,
    // Link between sprints and epics
    `CREATE TABLE IF NOT EXISTS sprint_epics (
      sprint_id TEXT NOT NULL,
      epic_id TEXT NOT NULL,
      PRIMARY KEY (sprint_id, epic_id),
      FOREIGN KEY (sprint_id) REFERENCES sprints(id),
      FOREIGN KEY (epic_id) REFERENCES epics(id)
    );`,
    // Work items
    `CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee_id TEXT,
      priority TEXT NOT NULL,
      estimation_points INTEGER NOT NULL,
      effort_hours REAL NOT NULL,
      due_date TEXT NOT NULL,
      group_name TEXT,
      stack TEXT,
      sprint_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL,
      reporter_id TEXT NOT NULL,
      epic_id TEXT,
      team_id TEXT,
      labels TEXT,
      attachments TEXT,
      watchers TEXT,
      parent_id TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (sprint_id) REFERENCES sprints(id),
      FOREIGN KEY (epic_id) REFERENCES epics(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );`,
    // Many-to-many for work item assignees (multi-assignee support)
    `CREATE TABLE IF NOT EXISTS work_item_assignees (
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (item_id, user_id),
      FOREIGN KEY (item_id) REFERENCES work_items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    // Checklist items
    `CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      text TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES work_items(id)
    );`,
    // Comments
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      mentions TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES work_items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    // Work item transitions for reports
    `CREATE TABLE IF NOT EXISTS work_item_transition (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      at TEXT NOT NULL,
      by_user_id TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES work_items(id),
      FOREIGN KEY (by_user_id) REFERENCES users(id)
    );`,
    // Calendar events
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      linked_work_item_id TEXT,
      attendees TEXT,
      created_by TEXT NOT NULL,
      online_link TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id),
      FOREIGN KEY (linked_work_item_id) REFERENCES work_items(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );`,
    // Join requests for boards
    `CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      requested_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    // Invite codes
    `CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      uses INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      expires_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id),
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );`,
    // Saved views
    `CREATE TABLE IF NOT EXISTS saved_views (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      filter_set TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );`
  ];
  const exec = db.exec.bind(db);
  db.transaction(() => {
    queries.forEach(q => exec(q));
  })();
}

// Initialize roles if not present
function seedRoles() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM roles').get().c;
  if (count === 0) {
    const roles = [
      {
        id: 'SCRUM_MASTER',
        name: 'Scrum Master',
        permissions: JSON.stringify([
          'item.create','item.edit.own','item.edit.any','item.delete','epic.manage','member.manage','sprint.manage'
        ])
      },
      {
        id: 'PRODUCT_OWNER',
        name: 'Product Owner',
        permissions: JSON.stringify([
          'item.create','item.edit.own','item.edit.any','epic.manage','sprint.manage'
        ])
      },
      {
        id: 'MEMBER',
        name: 'Member',
        permissions: JSON.stringify([
          'item.create','item.edit.own'
        ])
      }
    ];
    const stmt = db.prepare('INSERT INTO roles (id,name,permissions) VALUES (@id,@name,@permissions)');
    const insertMany = db.transaction((rows) => {
      for (const row of rows) stmt.run(row);
    });
    insertMany(roles);
  }
}

// Exported functions and database instance
function initialize() {
  runMigrations();
  seedRoles();
}

module.exports = {
  db,
  initialize
};
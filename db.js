/*
 * db.js
 *
 * Initializes an embedded SQLite database and exposes a shared connection.
 * The schema is designed to support the major entities used throughout the
 * ScrumOwl application including boards, epics, sprints, work items,
 * assignments, transitions, comments and events. Each table includes
 * sensible defaults and constraints where possible. When the module
 * is first imported it will create any missing tables automatically.
 */

const Database = require('better-sqlite3');

// Path to the database file can be customised via the DB_PATH environment
// variable. Defaults to `data.db` in the project root.
const dbPath = process.env.DB_PATH || 'data.db';
const db = new Database(dbPath);

/**
 * Sets up the database schema. Tables are created if they do not already
 * exist. A simple versioning mechanism could be added here in the future
 * by storing schema version in a dedicated table.
 */
function initSchema() {
  // Users table – represents individual people who can own or be assigned
  // work items. Users are referenced by their unique `id`.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar_url TEXT
    );
  `).run();

  // Roles table – defines a limited set of roles a user can have on a board.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `).run();

  // Boards table – top level container for all work. Boards hold epics,
  // sprints, work items, and events. A `key` is stored for display
  // purposes (e.g. `PROJ`).
  db.prepare(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `).run();

  // Board members table – stores which users belong to which board and
  // their role on that board. The primary key enforces uniqueness per
  // (board_id, user_id) pair.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS board_members (
      board_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (board_id, user_id),
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `).run();

  // Teams table – a way to group users within a board (e.g. frontend team).
  db.prepare(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `).run();

  // Team members table – associates users with teams. Composite primary key
  // prevents duplicate entries.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `).run();

  // Epics table – high level pieces of work. Contains ICE fields and status
  // for ordering and filtering. Soft deletion via `deleted_at`.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS epics (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      summary TEXT,
      description TEXT,
      ice_impact INTEGER DEFAULT 0,
      ice_confidence INTEGER DEFAULT 0,
      ice_ease INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `).run();

  // Sprints table – iterations of work inside a board. Includes date
  // boundaries and state. Soft deletion via `deleted_at`.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      number INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      goal TEXT,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `).run();

  // Sprint-to-epic link table – associates epics with sprints. Composite
  // primary key prevents duplicates.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sprint_epics (
      sprint_id TEXT NOT NULL,
      epic_id TEXT NOT NULL,
      PRIMARY KEY (sprint_id, epic_id),
      FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
      FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE
    );
  `).run();

  // Work items table – records all stories, tasks, bugs, tickets and
  // sub-items. Many optional fields are stored as JSON strings (labels,
  // checklist, attachments, watchers) for flexibility. `deleted_at`
  // signals a soft delete.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      sprint_id TEXT,
      group_name TEXT,
      stack TEXT,
      estimation_points INTEGER DEFAULT 0,
      effort_hours REAL DEFAULT 0,
      due_date TEXT,
      labels TEXT,
      checklist TEXT,
      attachments TEXT,
      watchers TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      parent_id TEXT,
      epic_id TEXT,
      team_id TEXT,
      deleted_at TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (sprint_id) REFERENCES sprints(id),
      FOREIGN KEY (parent_id) REFERENCES work_items(id),
      FOREIGN KEY (epic_id) REFERENCES epics(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );
  `).run();

  // Work item assignees – associates users with work items. `is_primary`
  // denotes the main assignee. Additional assignees are supported.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS work_item_assignees (
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      PRIMARY KEY (item_id, user_id),
      FOREIGN KEY (item_id) REFERENCES work_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `).run();

  // Work item transitions – logs every status change for a work item.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS work_item_transitions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      board_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      at TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES work_items(id) ON DELETE CASCADE,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );
  `).run();

  // Comments table – stores user comments on work items. Mentions are
  // stored as a JSON array of user IDs.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      mentions TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES work_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `).run();

  // Calendar events table – records meetings and other scheduled
  // occurrences. `attendees` is a JSON array of user IDs.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      linked_work_item_id TEXT,
      attendees TEXT,
      created_by TEXT NOT NULL,
      online_link TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (linked_work_item_id) REFERENCES work_items(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `).run();
}

// Initialise the schema when the module is loaded.
initSchema();

module.exports = db;
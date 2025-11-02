const { Pool } = require('pg');

// Database connection configuration
// Connection parameters are read from environment variables:
// - DATABASE_URL: complete postgres connection string. If not provided,
//   individual parameters (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
//   are used by pg.Pool implicitly.

// Create a connection pool. The pool will be automatically
// configured based on environment variables. See pg documentation
// for details: https://node-postgres.com/
const pool = new Pool({
  // Allow applications to set a DATABASE_URL directly or rely on PG* vars.
  connectionString: process.env.DATABASE_URL,
  // ssl can be enabled with DATABASE_SSL=true in production environments
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

/**
 * Initialize all database tables. This function creates tables if
 * they do not already exist. It runs sequentially to ensure
 * correct ordering of dependencies. If the tables are already
 * present, the CREATE TABLE IF NOT EXISTS statements will be
 * ignored.
 */
async function initSchema() {
  // Roles table: define scrum roles. We'll seed this later if empty.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // Users table. In a real application you would store names,
  // avatars, emails and possibly OAuth identifiers. Here only
  // minimal fields are defined.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT,
      email TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);

  // Boards table to separate data for each project.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);

  // Board members: mapping of users to boards with roles.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS board_members (
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(id),
      joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (board_id, user_id)
    );
  `);

  // Teams within a board.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);

  // Team members mapping.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, user_id)
    );
  `);

  // Epics table. Each epic belongs to a board.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS epics (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      summary TEXT,
      description TEXT,
      color TEXT,
      ice_impact INTEGER,
      ice_confidence INTEGER,
      ice_ease INTEGER,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
  `);

  // Sprints table.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sprints (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      goal TEXT,
      start_date DATE,
      end_date DATE,
      number TEXT,
      state TEXT DEFAULT 'PLANNED',
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
  `);

  // Link table: which epics belong to which sprints.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sprint_epics (
      sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
      epic_id UUID REFERENCES epics(id) ON DELETE CASCADE,
      PRIMARY KEY (sprint_id, epic_id)
    );
  `);

  // Work items table. Many optional fields to support all item types.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_items (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT,
      estimation_points INTEGER,
      effort_hours NUMERIC,
      due_date DATE,
      epic_id UUID REFERENCES epics(id) ON DELETE SET NULL,
      sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
      done_in_sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
      parent_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
      team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
      stack TEXT,
      branch_required BOOLEAN DEFAULT FALSE,
      branch_name TEXT,
      toc_enabled BOOLEAN DEFAULT FALSE,
      labels JSONB DEFAULT '[]'::jsonb,
      checklist JSONB DEFAULT '[]'::jsonb,
      attachments JSONB DEFAULT '[]'::jsonb,
      watchers JSONB DEFAULT '[]'::jsonb,
      version INTEGER DEFAULT 1,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
  `);

  // Table mapping work items to multiple assignees.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_item_assignees (
      item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      is_primary BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (item_id, user_id)
    );
  `);

  // Transition log for work items.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_item_transitions (
      id UUID PRIMARY KEY,
      item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT,
      at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      by_user UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Comments table for work items.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY,
      item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      content TEXT,
      mentions JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
  `);

  // Events table for calendar. Participants stored in separate table.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      start_at TIMESTAMP WITHOUT TIME ZONE,
      end_at TIMESTAMP WITHOUT TIME ZONE,
      location TEXT,
      link_url TEXT,
      privacy TEXT DEFAULT 'board', -- board|team|private
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'going',
      PRIMARY KEY (event_id, user_id)
    );
  `);

  // Join requests for board.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS join_requests (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending', -- pending|approved|rejected
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);

  // Invite codes for board.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITHOUT TIME ZONE,
      uses_left INTEGER
    );
  `);

  // Saved views. Store parameters as JSONB.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_views (
      id UUID PRIMARY KEY,
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      params JSONB,
      visibility TEXT DEFAULT 'private', -- private|group
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
  `);

  // Seed default roles if not present. We'll insert scrum_master, product_owner and member.
  await pool.query(`
    INSERT INTO roles(name)
    VALUES
      ('scrum_master'),
      ('product_owner'),
      ('member')
    ON CONFLICT (name) DO NOTHING;
  `);
}

module.exports = {
  pool,
  initSchema,
};
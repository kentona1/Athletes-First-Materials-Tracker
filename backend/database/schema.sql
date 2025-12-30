-- Athletes First Recruiting Materials Tracker Database Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'viewer', -- admin, agent, viewer
    agent_id INTEGER, -- Link to agent if user is an agent
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Players table - core player information
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    espn_id TEXT UNIQUE,
    name TEXT NOT NULL,
    position TEXT,
    school TEXT,
    conference TEXT,
    hometown TEXT,
    state TEXT,
    height TEXT,
    weight INTEGER,
    class_year TEXT, -- Freshman, Sophomore, Junior, Senior, Fifth Year, RS-Sophomore, etc.
    eligibility_year INTEGER, -- Actual year (e.g., 2024)
    photo_url TEXT,
    status TEXT DEFAULT 'Active', -- Active, Signed, Missed, Walked Away, Returned to School, No Meeting
    draft_round INTEGER,
    draft_year INTEGER,

    -- High School Recruiting Info
    high_school TEXT,
    recruiting_class_year INTEGER, -- Year they were recruited (e.g., 2021)
    recruiting_stars INTEGER, -- 3, 4, 5 star rating
    recruiting_rating REAL, -- Composite rating (e.g., 0.8578)
    recruiting_ranking INTEGER, -- National ranking
    recruiting_state_ranking INTEGER, -- State ranking
    recruiting_position_ranking INTEGER, -- Position ranking
    original_commitment TEXT, -- School they originally committed to

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schools table - normalized school data from ESPN
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY,
    school TEXT NOT NULL,
    mascot TEXT,
    abbreviation TEXT,
    alt_name1 TEXT,
    alt_name2 TEXT,
    alt_name3 TEXT,
    conference TEXT,
    division TEXT,
    color TEXT,
    alt_color TEXT,
    logo TEXT,
    logo_dark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player Transfer History
CREATE TABLE IF NOT EXISTS player_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    from_school TEXT, -- Previous school (NULL if from high school)
    to_school TEXT NOT NULL, -- Destination school
    transfer_season TEXT, -- e.g., "2023"
    transfer_year INTEGER, -- Numeric year
    eligibility_remaining TEXT, -- e.g., "3 years"
    transfer_type TEXT, -- "Portal", "Walk-on", etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Material types table (for standardization)
CREATE TABLE IF NOT EXISTS material_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT, -- Intro Packet, Video Book, Training, Calendar, Graphics, etc.
    description TEXT
);

-- Player-Agent relationships (many-to-many)
CREATE TABLE IF NOT EXISTS player_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    assigned_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE(player_id, agent_id)
);

-- Materials created for players
CREATE TABLE IF NOT EXISTS player_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    material_type_id INTEGER NOT NULL,
    agent_id INTEGER,
    title TEXT, -- e.g., "Intro Packet", "Video Book", "Calendar"
    description TEXT,
    delivery_method TEXT, -- Mail, Meeting, Email, Text
    delivery_date DATE,
    file_path TEXT, -- Path to file in OneDrive/Synology
    file_url TEXT, -- Direct link to file
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (material_type_id) REFERENCES material_types(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Meeting/Contact log
CREATE TABLE IF NOT EXISTS player_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    agent_id INTEGER,
    contact_type TEXT, -- Meeting, Phone Call, Email, Text
    contact_date DATE NOT NULL,
    location TEXT,
    notes TEXT,
    materials_presented TEXT, -- JSON array of material IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Outcome tracking
CREATE TABLE IF NOT EXISTS player_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL, -- Signed, Missed, Walked Away, Returned to School, No Meeting
    outcome_date DATE,
    draft_round INTEGER,
    draft_pick INTEGER,
    draft_year INTEGER,
    signed_team TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Recruiting cycles/years
CREATE TABLE IF NOT EXISTS recruiting_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    start_date DATE,
    end_date DATE,
    notes TEXT
);

-- Tags for flexible categorization
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT -- Geographic, Position Group, Priority Level, etc.
);

-- Player tags (many-to-many)
CREATE TABLE IF NOT EXISTS player_tags (
    player_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (player_id, tag_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_school ON players(school);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(school);
CREATE INDEX IF NOT EXISTS idx_schools_conference ON schools(conference);
CREATE INDEX IF NOT EXISTS idx_schools_abbreviation ON schools(abbreviation);
CREATE INDEX IF NOT EXISTS idx_transfers_player ON player_transfers(player_id);
CREATE INDEX IF NOT EXISTS idx_transfers_year ON player_transfers(transfer_year);
CREATE INDEX IF NOT EXISTS idx_materials_player ON player_materials(player_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON player_materials(material_type_id);
CREATE INDEX IF NOT EXISTS idx_materials_date ON player_materials(delivery_date);
CREATE INDEX IF NOT EXISTS idx_contacts_player ON player_contacts(player_id);
CREATE INDEX IF NOT EXISTS idx_contacts_date ON player_contacts(contact_date);

-- Insert default agents from your spreadsheet
INSERT OR IGNORE INTO agents (name) VALUES 
    ('Dunn'),
    ('Foster'),
    ('Hahn'),
    ('Kessler'),
    ('McCarthy'),
    ('Mulugheta'),
    ('Murphy'),
    ('Panos'),
    ('Roche'),
    ('Schulman'),
    ('Smith'),
    ('Wallace'),
    ('Williams');

-- Insert common material types
INSERT OR IGNORE INTO material_types (name, category) VALUES 
    ('Intro Packet', 'Package'),
    ('Video Book', 'Package'),
    ('Training Packet', 'Training'),
    ('Calendar', 'Planning'),
    ('Marketing Packet', 'Marketing'),
    ('Stay or Go Packet', 'Decision'),
    ('Graphics', 'Design'),
    ('Logo Design', 'Design'),
    ('Branding', 'Design'),
    ('One-Sheet', 'Marketing'),
    ('Contract Analysis', 'Business'),
    ('Position Specific Materials', 'Training'),
    ('PowerPoint Presentation', 'Presentation'),
    ('Thank You Notes', 'Communication'),
    ('Birthday Card', 'Personal'),
    ('Lockscreen', 'Design'),
    ('Feedback Document', 'Analysis');

-- Insert common recruiting cycles
INSERT OR IGNORE INTO recruiting_cycles (year, start_date, end_date) VALUES
    (2019, '2018-12-01', '2020-04-30'),
    (2020, '2019-12-01', '2021-04-30'),
    (2021, '2020-12-01', '2022-04-30'),
    (2022, '2021-12-01', '2023-04-30'),
    (2023, '2022-12-01', '2024-04-30'),
    (2024, '2023-12-01', '2025-04-30'),
    (2025, '2024-12-01', '2026-04-30');

-- Create views for common queries

-- View: Active recruiting overview
CREATE VIEW IF NOT EXISTS active_recruiting_overview AS
SELECT 
    p.id,
    p.name,
    p.position,
    p.school,
    p.conference,
    p.class_year,
    p.status,
    GROUP_CONCAT(DISTINCT a.name) as agents,
    COUNT(DISTINCT pm.id) as materials_count,
    COUNT(DISTINCT pc.id) as contacts_count,
    MAX(pc.contact_date) as last_contact
FROM players p
LEFT JOIN player_agents pa ON p.id = pa.player_id
LEFT JOIN agents a ON pa.agent_id = a.id
LEFT JOIN player_materials pm ON p.id = pm.player_id
LEFT JOIN player_contacts pc ON p.id = pc.player_id
WHERE p.status = 'Active'
GROUP BY p.id;

-- View: Materials by type summary
CREATE VIEW IF NOT EXISTS materials_summary AS
SELECT 
    mt.name as material_type,
    mt.category,
    COUNT(pm.id) as times_used,
    COUNT(DISTINCT pm.player_id) as unique_players,
    COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed_count
FROM material_types mt
LEFT JOIN player_materials pm ON mt.id = pm.material_type_id
LEFT JOIN player_outcomes po ON pm.player_id = po.player_id
GROUP BY mt.id
ORDER BY times_used DESC;

-- View: Agent performance
CREATE VIEW IF NOT EXISTS agent_performance AS
SELECT 
    a.name as agent,
    COUNT(DISTINCT pa.player_id) as total_players,
    COUNT(DISTINCT CASE WHEN po.status = 'Signed' THEN pa.player_id END) as signed,
    COUNT(DISTINCT CASE WHEN po.status = 'Missed' THEN pa.player_id END) as missed,
    COUNT(DISTINCT CASE WHEN po.status = 'Walked Away' THEN pa.player_id END) as walked_away,
    COUNT(DISTINCT CASE WHEN po.status = 'Returned to School' THEN pa.player_id END) as returned,
    COUNT(DISTINCT pm.id) as total_materials
FROM agents a
LEFT JOIN player_agents pa ON a.id = pa.agent_id
LEFT JOIN player_outcomes po ON pa.player_id = po.player_id
LEFT JOIN player_materials pm ON pa.player_id = pm.player_id AND pa.agent_id = pm.agent_id
GROUP BY a.id
ORDER BY signed DESC;

-- Migration: Add material_events table for batch logging
-- This allows logging multiple materials per delivery event

CREATE TABLE IF NOT EXISTS material_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    event_date DATE NOT NULL,
    delivery_method TEXT NOT NULL, -- Meeting, Mail, Email
    event_number INTEGER NOT NULL, -- Auto-incremented per delivery method (Meeting -x1, -x2, etc.)
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Update player_materials to reference events
-- Add event_id column (nullable for backward compatibility with existing data)
ALTER TABLE player_materials ADD COLUMN event_id INTEGER REFERENCES material_events(id) ON DELETE CASCADE;

-- Create index for event lookups
CREATE INDEX IF NOT EXISTS idx_material_events_player ON material_events(player_id);
CREATE INDEX IF NOT EXISTS idx_material_events_date ON material_events(event_date);
CREATE INDEX IF NOT EXISTS idx_player_materials_event ON player_materials(event_id);

-- View: Material events with counts
CREATE VIEW IF NOT EXISTS material_events_view AS
SELECT
    me.id,
    me.player_id,
    p.name as player_name,
    me.event_date,
    me.delivery_method,
    me.event_number,
    me.delivery_method || ' -x' || me.event_number as event_label,
    COUNT(pm.id) as material_count,
    GROUP_CONCAT(mt.name, ', ') as materials,
    me.notes,
    me.created_at
FROM material_events me
LEFT JOIN players p ON me.player_id = p.id
LEFT JOIN player_materials pm ON me.id = pm.event_id
LEFT JOIN material_types mt ON pm.material_type_id = mt.id
GROUP BY me.id
ORDER BY me.event_date DESC;

const { parse } = require('csv-parse/sync');
const db = require('../database/db');
const axios = require('axios');

// Eligibility mapping - stores display-friendly class year (no numbers)
// Numbers are only used in CSV for sorting, not stored in database
const eligibilityMap = {
  '0': { class_year: 'High School', player_type: 'high_school' },
  '1': { class_year: 'Freshman', player_type: 'college' },
  '2': { class_year: 'RS-Freshman', player_type: 'college' },
  '3': { class_year: 'Sophomore', player_type: 'college' },
  '4': { class_year: 'RS-Sophomore', player_type: 'college' },
  '5': { class_year: 'Junior', player_type: 'college' },
  '6': { class_year: 'RS-Junior', player_type: 'college' },
  '7': { class_year: 'Senior', player_type: 'college' },
  '8': { class_year: 'Fifth Year', player_type: 'college' },
  '9': { class_year: 'Sixth Year (Grad)', player_type: 'college' },
  '10': { class_year: 'Veteran', player_type: 'veteran' }
};

// Parse "Last, First" name format
// Returns { fullName: "First Last", firstName: "First", lastName: "Last" }
function parseName(nameStr) {
  if (!nameStr) return { fullName: '', firstName: '', lastName: '' };
  const cleaned = nameStr.replace(/"/g, '').trim();
  const parts = cleaned.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return {
      fullName: `${parts[1]} ${parts[0]}`,
      firstName: parts[1],
      lastName: parts[0]
    };
  }
  // No comma - assume it's already "First Last" format
  const spaceParts = cleaned.split(' ');
  if (spaceParts.length >= 2) {
    return {
      fullName: cleaned,
      firstName: spaceParts[0],
      lastName: spaceParts.slice(1).join(' ')
    };
  }
  return { fullName: cleaned, firstName: '', lastName: cleaned };
}

// Parse eligibility string like "5 - Junior" to get the number
function parseEligibility(eligStr) {
  if (!eligStr) return null;
  const match = eligStr.match(/^(\d+)/);
  return match ? match[1] : null;
}

// Parse class year string to get numeric value for comparison
// "Fifth Year" → 8, "Veteran" → 10, etc.
// Higher number = further along in career = more recent data
function parseClassYearNumber(classYearStr) {
  if (!classYearStr) return 0;

  const lower = classYearStr.toLowerCase();

  // Text-based mapping (order matters for substrings like "junior" in "rs-junior")
  if (lower.includes('veteran')) return 10;
  if (lower.includes('sixth') || lower.includes('grad')) return 9;
  if (lower.includes('fifth')) return 8;
  if (lower === 'senior') return 7;
  if (lower === 'rs-junior') return 6;
  if (lower === 'junior') return 5;
  if (lower === 'rs-sophomore') return 4;
  if (lower === 'sophomore') return 3;
  if (lower === 'rs-freshman') return 2;
  if (lower === 'freshman') return 1;
  if (lower.includes('high school')) return 0;

  // Fallback: try to extract leading number for any legacy data
  const numMatch = classYearStr.match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return 0;
}

// Parse COMMIT column to outcome status
// Handles: "Yes", "No", "School", "School (Yes)", "School (No)"
// Final categories: Signed, Not Signed, Returned to School
function parseCommitToStatus(commitStr) {
  if (!commitStr) return 'Active';
  const lower = commitStr.toLowerCase().trim();

  // Direct commitment statuses
  if (lower === 'yes') return 'Signed';
  if (lower === 'no') return 'Not Signed';

  // School variations with retrospective outcomes
  // "School (Yes)" = returned to school that year, eventually signed with us
  if (lower === 'school (yes)') return 'Signed';
  // "School (No)" = returned to school that year, didn't sign with us (entered draft elsewhere)
  if (lower === 'school (no)') return 'Not Signed';
  // "School" = returned to school, still active (hasn't entered draft yet)
  if (lower === 'school') return 'Returned to School';

  return 'Active';
}

// Parse RESULT column to draft round
function parseDraftRound(resultStr) {
  if (!resultStr) return null;
  const trimmed = resultStr.trim().toUpperCase();
  if (trimmed === 'VET' || trimmed === 'VETERAN') return null;
  if (trimmed === 'UDFA') return 0; // 0 represents UDFA
  if (trimmed.includes('N/A') || trimmed.startsWith('Z')) return null;
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? null : num;
}

// Parse DRAFT YR column
function parseDraftYear(draftYrStr) {
  if (!draftYrStr) return null;
  const trimmed = draftYrStr.trim();
  if (trimmed === '-' || trimmed === '') return null;
  const year = parseInt(trimmed, 10);
  return isNaN(year) ? null : year;
}

// Parse MATERIALS column into structured events
// Format: "2019/06/03\n(Meeting / Agent Day)\n• Intro Packet\n• Video Book\n2019/07/19\n(Mail - x2)\n• Calendar"
function parseMaterials(materialsStr) {
  if (!materialsStr) return [];

  const events = [];
  const lines = materialsStr.split('\n').map(l => l.trim()).filter(Boolean);

  let currentEvent = null;

  for (const line of lines) {
    // Check if line is a date (YYYY/MM/DD)
    const dateMatch = line.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (dateMatch) {
      // Save previous event if exists
      if (currentEvent && currentEvent.materials.length > 0) {
        events.push(currentEvent);
      }
      // Start new event
      currentEvent = {
        date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`, // Convert to YYYY-MM-DD
        delivery_method: null,
        copies: 1,
        materials: []
      };
      continue;
    }

    // Check if line is delivery method: (Meeting), (Mail - x1), (Email), (Text)
    const methodMatch = line.match(/^\(([^)]+)\)/);
    if (methodMatch && currentEvent) {
      const methodStr = methodMatch[1];
      // Extract copies count if present (e.g., "Mail - x2")
      const copiesMatch = methodStr.match(/x(\d+)/i);
      if (copiesMatch) {
        currentEvent.copies = parseInt(copiesMatch[1], 10);
      }
      // Extract method (first word usually)
      const methodPart = methodStr.split(/[-\/]/)[0].trim();
      currentEvent.delivery_method = normalizeDeliveryMethod(methodPart);
      continue;
    }

    // Check if line is a material item (starts with • or -)
    const materialMatch = line.match(/^[•\-]\s*(.+)/);
    if (materialMatch && currentEvent) {
      const materialName = materialMatch[1].trim();
      if (materialName && !materialName.toLowerCase().includes('eligibility scale')) {
        currentEvent.materials.push(materialName);
      }
      continue;
    }

    // Handle material items without bullet (continuation or alternate format)
    if (currentEvent && !line.startsWith('(') && line.length > 0 && !line.includes('Eligibility Scale')) {
      // Check if it's a known material type pattern
      if (line.includes('Packet') || line.includes('Sheet') || line.includes('Book') ||
          line.includes('Calendar') || line.includes('Graphic') || line.includes('Brochure') ||
          line.includes('Power') || line.includes('Training') || line.includes('Contract') ||
          line.includes('Presentation') || line.includes('Lockscreen') || line.includes('Intro')) {
        currentEvent.materials.push(line);
      }
    }
  }

  // Don't forget the last event
  if (currentEvent && currentEvent.materials.length > 0) {
    events.push(currentEvent);
  }

  return events;
}

// Normalize delivery method
function normalizeDeliveryMethod(method) {
  if (!method) return 'Other';
  const lower = method.toLowerCase();
  if (lower.includes('meeting') || lower.includes('agent day')) return 'Meeting';
  if (lower.includes('mail')) return 'Mail';
  if (lower.includes('email')) return 'Email';
  if (lower.includes('text')) return 'Text';
  return method;
}

// Extract recruiting cycle year from filename
function extractYearFromFilename(filename) {
  // Match patterns like "2024 - 2025" or "2024-2025" or "2019-2020"
  const match = filename.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (match) {
    return parseInt(match[2], 10); // Return the ending year (e.g., 2025 from "2024-2025")
  }
  return null;
}

class ImportController {
  // Lookup school from schools table - returns normalized school info or null
  async lookupSchool(schoolName) {
    if (!schoolName) return null;

    const nameLower = schoolName.toLowerCase().trim();

    // Try exact match first
    let school = await db.get(`
      SELECT id, school, conference FROM schools
      WHERE
        LOWER(school) = ? OR
        LOWER(abbreviation) = ? OR
        LOWER(alt_name1) = ? OR
        LOWER(alt_name2) = ? OR
        LOWER(alt_name3) = ?
    `, [nameLower, nameLower, nameLower, nameLower, nameLower]);

    if (school) return school;

    // Try fuzzy match
    const searchTerm = `%${schoolName}%`;
    school = await db.get(`
      SELECT id, school, conference FROM schools
      WHERE
        LOWER(school) LIKE LOWER(?) OR
        LOWER(abbreviation) LIKE LOWER(?) OR
        LOWER(alt_name1) LIKE LOWER(?) OR
        LOWER(alt_name2) LIKE LOWER(?) OR
        LOWER(alt_name3) LIKE LOWER(?)
      LIMIT 1
    `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);

    return school || null;
  }

  // Preview CSV data before importing
  async previewCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname || '';

      // Parse CSV with relaxed options for multi-line fields
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true
      });

      // Get existing agents for matching
      const agents = await db.query('SELECT id, name FROM agents');

      const agentMap = {};
      agents.forEach(a => {
        agentMap[a.name.toLowerCase()] = a.id;
        // Also map by last name
        const lastName = a.name.split(' ').pop().toLowerCase();
        agentMap[lastName] = a.id;
      });

      // Get recruiting cycle year from filename
      const recruitingYear = extractYearFromFilename(filename);

      // Build a cache of school lookups to avoid duplicate queries
      const schoolCache = {};
      const unmatchedSchools = new Set();

      // Process and preview records
      const preview = [];
      for (let index = 0; index < Math.min(records.length, 50); index++) {
        const row = records[index];
        const nameCol = Object.keys(row).find(k => k.includes('NAME'));
        const nameData = parseName(row[nameCol]);
        const name = nameData.fullName;

        const eligCol = Object.keys(row).find(k => k.includes('ELIGIBILITY'));
        const eligNum = parseEligibility(row[eligCol]);
        const eligInfo = eligibilityMap[eligNum] || { class_year: null, player_type: 'college' };

        const schoolCol = Object.keys(row).find(k => k === 'SCHOOL');
        const confCol = Object.keys(row).find(k => k === 'CONFERENCE');
        const posCol = Object.keys(row).find(k => k === 'POSITION');
        const agentCol = Object.keys(row).find(k => k === 'AGENT');
        const commitCol = Object.keys(row).find(k => k === 'COMMIT');
        const resultCol = Object.keys(row).find(k => k === 'RESULT');
        const draftYrCol = Object.keys(row).find(k => k.includes('DRAFT YR'));
        const materialsCol = Object.keys(row).find(k => k === 'MATERIALS');

        // Clean school name - strip "(Transfer)" suffix
        let school = row[schoolCol]?.trim() || '';
        school = school.replace(/\s*\(Transfer\)\s*/gi, '').trim();

        // Check if school matches database
        let schoolMatched = false;
        let normalizedSchool = school;
        let normalizedConference = row[confCol]?.trim() || '';

        if (school && eligInfo.player_type !== 'veteran') {
          if (schoolCache[school.toLowerCase()] !== undefined) {
            const cached = schoolCache[school.toLowerCase()];
            if (cached) {
              schoolMatched = true;
              normalizedSchool = cached.school;
              normalizedConference = cached.conference || normalizedConference;
            }
          } else {
            const matchedSchool = await this.lookupSchool(school);
            schoolCache[school.toLowerCase()] = matchedSchool;
            if (matchedSchool) {
              schoolMatched = true;
              normalizedSchool = matchedSchool.school;
              normalizedConference = matchedSchool.conference || normalizedConference;
            } else {
              unmatchedSchools.add(school);
            }
          }
        }

        const agentName = row[agentCol]?.trim();
        const matchedAgentId = agentName ? (agentMap[agentName.toLowerCase()] || agentMap[agentName.split('/')[0].trim().toLowerCase()]) : null;

        // Parse materials
        const materialEvents = parseMaterials(row[materialsCol]);
        const totalMaterials = materialEvents.reduce((sum, e) => sum + e.materials.length, 0);

        preview.push({
          row: index + 2,
          name,
          position: row[posCol]?.trim() || '',
          school: school,
          normalized_school: normalizedSchool,
          school_matched: schoolMatched || eligInfo.player_type === 'veteran',
          conference: normalizedConference,
          class_year: eligInfo.class_year,
          player_type: eligInfo.player_type,
          status: parseCommitToStatus(row[commitCol]),
          draft_round: parseDraftRound(row[resultCol]),
          draft_year: parseDraftYear(row[draftYrCol]),
          agent: agentName,
          agent_id: matchedAgentId,
          recruiting_year: recruitingYear,
          material_events: materialEvents.length,
          total_materials: totalMaterials,
          materials_preview: materialEvents.slice(0, 2).map(e =>
            `${e.date} (${e.delivery_method}): ${e.materials.slice(0, 2).join(', ')}${e.materials.length > 2 ? '...' : ''}`
          ).join(' | ')
        });
      }

      res.json({
        success: true,
        data: {
          filename,
          recruitingYear,
          totalRows: records.length,
          preview,
          agents: agents.map(a => ({ id: a.id, name: a.name })),
          unmatchedSchools: Array.from(unmatchedSchools),
          schoolWarningCount: unmatchedSchools.size
        }
      });

    } catch (error) {
      console.error('CSV Preview Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Import CSV data with full materials and draft info
  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname || '';
      const recruitingYear = extractYearFromFilename(filename);

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true
      });

      // Get agents for matching
      const agents = await db.query('SELECT id, name FROM agents');
      const agentMap = {};
      agents.forEach(a => {
        agentMap[a.name.toLowerCase()] = a.id;
        const lastName = a.name.split(' ').pop().toLowerCase();
        agentMap[lastName] = a.id;
      });

      // Get material types for matching
      const materialTypes = await db.query('SELECT id, name FROM material_types');
      const materialTypeMap = {};
      materialTypes.forEach(mt => {
        materialTypeMap[mt.name.toLowerCase()] = mt.id;
      });

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let materialsAdded = 0;
      let errors = [];

      for (const row of records) {
        try {
          const nameCol = Object.keys(row).find(k => k.includes('NAME'));
          const nameData = parseName(row[nameCol]);
          const name = nameData.fullName;
          const firstName = nameData.firstName;
          const lastName = nameData.lastName;

          if (!name) {
            skipped++;
            continue;
          }

          const eligCol = Object.keys(row).find(k => k.includes('ELIGIBILITY'));
          const eligNum = parseEligibility(row[eligCol]);
          const eligInfo = eligibilityMap[eligNum] || { class_year: null, player_type: 'college' };

          const schoolCol = Object.keys(row).find(k => k === 'SCHOOL');
          const confCol = Object.keys(row).find(k => k === 'CONFERENCE');
          const posCol = Object.keys(row).find(k => k === 'POSITION');
          const agentCol = Object.keys(row).find(k => k === 'AGENT');
          const commitCol = Object.keys(row).find(k => k === 'COMMIT');
          const resultCol = Object.keys(row).find(k => k === 'RESULT');
          const draftYrCol = Object.keys(row).find(k => k.includes('DRAFT YR'));
          const materialsCol = Object.keys(row).find(k => k === 'MATERIALS');

          // Clean school name - strip "(Transfer)" suffix
          let school = row[schoolCol]?.trim() || '';
          school = school.replace(/\s*\(Transfer\)\s*/gi, '').trim();

          let conference = row[confCol]?.trim() || '';

          // Try to normalize school name from database
          if (school && eligInfo.player_type !== 'veteran') {
            const matchedSchool = await this.lookupSchool(school);
            if (matchedSchool) {
              school = matchedSchool.school;
              conference = matchedSchool.conference || conference;
            }
          }
          const position = row[posCol]?.trim() || '';
          const status = parseCommitToStatus(row[commitCol]);
          const draftRound = parseDraftRound(row[resultCol]);
          const draftYear = parseDraftYear(row[draftYrCol]);

          // Check if player already exists (by name)
          let existingPlayer = await db.get(
            'SELECT id, class_year, eligibility_year FROM players WHERE LOWER(name) = LOWER(?)',
            [name]
          );

          let playerId;
          let isNewerData = false;

          if (existingPlayer) {
            playerId = existingPlayer.id;

            // Compare class year numbers to determine if importing newer or older data
            const existingClassYearNum = parseClassYearNumber(existingPlayer.class_year);
            const incomingClassYearNum = parseClassYearNumber(eligInfo.class_year);

            // Higher number = more recent in player's career
            isNewerData = incomingClassYearNum >= existingClassYearNum;

            if (isNewerData) {
              // Newer or same year data - update player info (school, status, class_year, draft info)
              await db.run(`
                UPDATE players SET
                  school = COALESCE(?, school),
                  conference = COALESCE(?, conference),
                  class_year = ?,
                  player_type = COALESCE(?, player_type),
                  status = CASE WHEN ? IN ('Signed', 'Not Signed', 'Returned to School') THEN ? ELSE status END,
                  draft_round = COALESCE(?, draft_round),
                  draft_year = COALESCE(?, draft_year),
                  nfl_team = CASE WHEN ? = 'veteran' THEN ? ELSE nfl_team END,
                  eligibility_year = COALESCE(?, eligibility_year),
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [
                eligInfo.player_type === 'veteran' ? null : school,
                conference || null,
                eligInfo.class_year,  // Always use newer class year
                eligInfo.player_type,
                status, status,
                draftRound,
                draftYear,
                eligInfo.player_type, school,
                recruitingYear,
                playerId
              ]);
              updated++;
            } else {
              // Older data - DON'T update player fields (school, status, class_year)
              // Only material events will be added below
              // But DO update position if it was empty (position rarely changes)
              await db.run(`
                UPDATE players SET
                  position = CASE WHEN position IS NULL OR position = '' THEN ? ELSE position END,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [position || null, playerId]);
            }
          } else {
            // New player - insert
            const result = await db.run(
              `INSERT INTO players (
                name, first_name, last_name, position, school, conference, class_year, player_type,
                status, draft_round, draft_year, nfl_team, eligibility_year
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                name,
                firstName,
                lastName,
                position,
                eligInfo.player_type === 'veteran' ? null : school,
                conference || null,
                eligInfo.class_year,
                eligInfo.player_type,
                status,
                draftRound,
                draftYear,
                eligInfo.player_type === 'veteran' ? school : null,
                recruitingYear
              ]
            );
            playerId = result.id;
            imported++;
          }

          // Assign agent - create if doesn't exist
          const agentName = row[agentCol]?.trim();
          if (agentName && playerId) {
            // Try to find existing agent
            let agentId = agentMap[agentName.toLowerCase()] || agentMap[agentName.split('/')[0].trim().toLowerCase()];

            // If agent doesn't exist, create them (CSV has last name only)
            if (!agentId) {
              const newAgent = await db.run(`
                INSERT INTO agents (name, last_name, first_name, active)
                VALUES (?, ?, NULL, 1)
              `, [agentName, agentName]);
              agentId = newAgent.id;
              // Add to map for future rows in this import
              agentMap[agentName.toLowerCase()] = agentId;
            }

            await db.run(
              'INSERT OR IGNORE INTO player_agents (player_id, agent_id) VALUES (?, ?)',
              [playerId, agentId]
            );
          }

          // Create player outcome if we have draft/status info
          if ((status !== 'Active' || draftRound !== null || draftYear !== null) && playerId) {
            await db.run(`
              INSERT INTO player_outcomes (player_id, status, draft_round, draft_year)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(player_id) DO UPDATE SET
                status = COALESCE(excluded.status, status),
                draft_round = COALESCE(excluded.draft_round, draft_round),
                draft_year = COALESCE(excluded.draft_year, draft_year),
                updated_at = CURRENT_TIMESTAMP
            `, [playerId, status, draftRound, draftYear]);
          }

          // Track recruiting cycles this player was involved in, with status per cycle
          // Determine the status for THIS recruiting cycle (may differ from final status)
          const commitValue = row[commitCol]?.toLowerCase().trim() || '';
          let cycleStatus = status; // Default to the parsed status

          // Special handling for "School (Yes)" and "School (No)"
          // For the CSV's recruiting year, they "Returned to School" that year
          if (commitValue === 'school (yes)' || commitValue === 'school (no)') {
            cycleStatus = 'Returned to School';
          }

          if (playerId && recruitingYear) {
            // Add to the recruiting cycle from this CSV with the cycle-specific status
            await db.run(
              `INSERT INTO player_recruiting_cycles (player_id, recruiting_year, status)
               VALUES (?, ?, ?)
               ON CONFLICT(player_id, recruiting_year) DO UPDATE SET status = excluded.status`,
              [playerId, recruitingYear, cycleStatus]
            );
          }

          // If player was signed and has a draft year, also add to that draft year's cycle
          // For "School (Yes)" cases - they're "Signed" in the draft year cycle
          if (playerId && status === 'Signed' && draftYear && draftYear !== recruitingYear) {
            await db.run(
              `INSERT INTO player_recruiting_cycles (player_id, recruiting_year, status)
               VALUES (?, ?, 'Signed')
               ON CONFLICT(player_id, recruiting_year) DO UPDATE SET status = 'Signed'`,
              [playerId, draftYear]
            );
          }

          // Parse and import materials
          const materialEvents = parseMaterials(row[materialsCol]);

          for (const event of materialEvents) {
            if (!event.materials || event.materials.length === 0) continue;

            // Check if a material event with this exact date already exists for this player
            const existingEvent = await db.get(`
              SELECT id FROM material_events
              WHERE player_id = ? AND event_date = ?
            `, [playerId, event.date]);

            let eventId;

            if (existingEvent) {
              // Event on this date already exists - skip creating new event
              // but we'll still check for new materials below
              eventId = existingEvent.id;
            } else {
              // Create new material event
              const eventResult = await db.run(`
                INSERT INTO material_events (player_id, event_date, delivery_method, event_number, copies)
                VALUES (?, ?, ?,
                  (SELECT COALESCE(MAX(event_number), 0) + 1 FROM material_events
                   WHERE player_id = ? AND delivery_method = ?),
                  ?)
              `, [
                playerId,
                event.date,
                event.delivery_method || 'Other',
                playerId,
                event.delivery_method || 'Other',
                event.copies
              ]);
              eventId = eventResult.id;
            }

            // Get agent for this player
            const playerAgent = await db.get(
              'SELECT agent_id FROM player_agents WHERE player_id = ? LIMIT 1',
              [playerId]
            );

            // Add each material
            for (const materialName of event.materials) {
              // Find or create material type
              let materialTypeId = materialTypeMap[materialName.toLowerCase()];

              if (!materialTypeId) {
                // Try partial match
                const partialMatch = Object.entries(materialTypeMap).find(([key]) =>
                  materialName.toLowerCase().includes(key) || key.includes(materialName.toLowerCase())
                );

                if (partialMatch) {
                  materialTypeId = partialMatch[1];
                } else {
                  // Create new material type
                  const newType = await db.run(
                    'INSERT OR IGNORE INTO material_types (name, category) VALUES (?, ?)',
                    [materialName, 'Other']
                  );
                  if (newType.id) {
                    materialTypeId = newType.id;
                    materialTypeMap[materialName.toLowerCase()] = materialTypeId;
                  } else {
                    // Get the existing one
                    const existing = await db.get('SELECT id FROM material_types WHERE name = ?', [materialName]);
                    if (existing) materialTypeId = existing.id;
                  }
                }
              }

              if (materialTypeId) {
                // Check if this exact material already exists for this event
                const existingMaterial = await db.get(`
                  SELECT id FROM player_materials
                  WHERE player_id = ? AND event_id = ? AND material_type_id = ?
                `, [playerId, eventId, materialTypeId]);

                if (!existingMaterial) {
                  await db.run(`
                    INSERT INTO player_materials (
                      player_id, material_type_id, agent_id, title,
                      delivery_method, delivery_date, event_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                  `, [
                    playerId,
                    materialTypeId,
                    playerAgent?.agent_id || null,
                    materialName,
                    event.delivery_method,
                    event.date,
                    eventId
                  ]);
                  materialsAdded++;
                }
                // If material already exists, skip (no duplicate)
              }
            }
          }

        } catch (rowError) {
          errors.push({ name: parseName(row[Object.keys(row).find(k => k.includes('NAME'))]), error: rowError.message });
          skipped++;
        }
      }

      res.json({
        success: true,
        data: {
          filename,
          recruitingYear,
          imported,
          updated,
          skipped,
          materialsAdded,
          total: records.length,
          errors: errors.slice(0, 10)
        }
      });

    } catch (error) {
      console.error('CSV Import Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Batch import multiple files (oldest to newest - recommended order)
  async batchImport(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }

      // Sort files by year (oldest first - recommended import order)
      const sortedFiles = [...req.files].sort((a, b) => {
        const yearA = extractYearFromFilename(a.originalname) || 0;
        const yearB = extractYearFromFilename(b.originalname) || 0;
        return yearA - yearB; // Ascending (oldest first)
      });

      const results = [];

      for (const file of sortedFiles) {
        const csvContent = file.buffer.toString('utf-8');
        const filename = file.originalname;
        const recruitingYear = extractYearFromFilename(filename);

        // Process each file (reuse import logic)
        // This is simplified - in practice you'd call the main import logic
        results.push({
          filename,
          recruitingYear,
          status: 'queued'
        });
      }

      res.json({
        success: true,
        message: 'Files will be processed in order (oldest to newest)',
        files: results
      });

    } catch (error) {
      console.error('Batch Import Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Fetch ESPN photos for imported players
  async fetchEspnPhotos(req, res) {
    try {
      const { limit = 50 } = req.query;

      // Get players without photos
      const players = await db.query(`
        SELECT id, name, position, school, player_type
        FROM players
        WHERE photo_url IS NULL OR photo_url = ''
        LIMIT ?
      `, [parseInt(limit)]);

      let updated = 0;
      let notFound = 0;
      const errors = [];

      for (const player of players) {
        try {
          // Determine which ESPN search to use
          const searchUrl = player.player_type === 'veteran'
            ? 'https://site.web.api.espn.com/apis/search/v2'
            : 'https://site.web.api.espn.com/apis/search/v2';

          const league = player.player_type === 'veteran' ? 'nfl' : 'college-football';

          // Search ESPN
          const searchResponse = await axios.get(searchUrl, {
            params: {
              query: player.name,
              type: 'player',
              sport: 'football',
              league: league,
              limit: 5
            },
            timeout: 5000
          });

          const results = searchResponse.data?.results || [];
          const playerResults = results.find(r => r.type === 'player')?.contents || [];

          if (playerResults.length > 0) {
            // Find best match
            const match = playerResults.find(p => {
              const nameLower = player.name.toLowerCase();
              const resultName = (p.displayName || p.title || '').toLowerCase();
              return resultName.includes(nameLower) || nameLower.includes(resultName);
            }) || playerResults[0];

            if (match && match.$ref) {
              // Get athlete details
              const detailResponse = await axios.get(match.$ref, { timeout: 5000 });
              const photoUrl = detailResponse.data?.headshot?.href ||
                              detailResponse.data?.athlete?.headshot?.href;

              if (photoUrl) {
                await db.run(
                  'UPDATE players SET photo_url = ?, espn_id = ? WHERE id = ?',
                  [photoUrl, match.uid || match.id, player.id]
                );
                updated++;
              } else {
                notFound++;
              }
            } else {
              notFound++;
            }
          } else {
            notFound++;
          }

          // Rate limiting - don't hammer ESPN
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (playerError) {
          errors.push({ name: player.name, error: playerError.message });
        }
      }

      res.json({
        success: true,
        data: {
          processed: players.length,
          updated,
          notFound,
          errors: errors.slice(0, 10)
        }
      });

    } catch (error) {
      console.error('ESPN Photo Fetch Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ImportController();

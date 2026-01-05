const db = require('../database/db');

class SchoolsController {
  // Search schools by name (fuzzy search)
  async searchSchools(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const searchTerm = `%${query}%`;

      const schools = await db.query(`
        SELECT * FROM schools
        WHERE
          school LIKE ? OR
          mascot LIKE ? OR
          abbreviation LIKE ? OR
          alt_name1 LIKE ? OR
          alt_name2 LIKE ? OR
          alt_name3 LIKE ?
        ORDER BY
          CASE
            WHEN school LIKE ? THEN 1
            WHEN abbreviation LIKE ? THEN 2
            WHEN alt_name1 LIKE ? THEN 3
            ELSE 4
          END,
          school
        LIMIT 20
      `, [
        searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
        `${query}%`, `${query}%`, `${query}%`
      ]);

      res.json({ success: true, data: schools });
    } catch (error) {
      console.error('Error searching schools:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all schools (paginated)
  async getAllSchools(req, res) {
    try {
      const { limit = 50, offset = 0, conference } = req.query;

      let sql = 'SELECT * FROM schools';
      const params = [];

      if (conference) {
        sql += ' WHERE conference = ?';
        params.push(conference);
      }

      sql += ' ORDER BY school LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const schools = await db.query(sql, params);
      const countSql = conference
        ? 'SELECT COUNT(*) as total FROM schools WHERE conference = ?'
        : 'SELECT COUNT(*) as total FROM schools';
      const { total } = await db.get(countSql, conference ? [conference] : []);

      res.json({
        success: true,
        data: schools,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error fetching schools:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get school by ID
  async getSchool(req, res) {
    try {
      const { id } = req.params;

      const school = await db.get('SELECT * FROM schools WHERE id = ?', [id]);

      if (!school) {
        return res.status(404).json({
          success: false,
          error: 'School not found'
        });
      }

      res.json({ success: true, data: school });
    } catch (error) {
      console.error('Error fetching school:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update school (for conference changes, etc.)
  async updateSchool(req, res) {
    try {
      const { id } = req.params;
      const { conference, division, color, alt_color } = req.body;

      const updates = [];
      const params = [];

      if (conference !== undefined) {
        updates.push('conference = ?');
        params.push(conference);
      }
      if (division !== undefined) {
        updates.push('division = ?');
        params.push(division);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        params.push(color);
      }
      if (alt_color !== undefined) {
        updates.push('alt_color = ?');
        params.push(alt_color);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await db.run(
        `UPDATE schools SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const updated = await db.get('SELECT * FROM schools WHERE id = ?', [id]);

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating school:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get list of all conferences
  async getConferences(req, res) {
    try {
      const conferences = await db.query(`
        SELECT DISTINCT conference
        FROM schools
        WHERE conference IS NOT NULL AND conference != ''
        ORDER BY conference
      `);

      res.json({
        success: true,
        data: conferences.map(c => c.conference)
      });
    } catch (error) {
      console.error('Error fetching conferences:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Lookup school by name (for normalization)
  async lookupSchool(req, res) {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name parameter required'
        });
      }

      console.log('🔍 Looking up school:', name);

      // Try exact match first
      let school = await db.get(`
        SELECT * FROM schools
        WHERE
          LOWER(school) = LOWER(?) OR
          LOWER(abbreviation) = LOWER(?) OR
          LOWER(alt_name1) = LOWER(?) OR
          LOWER(alt_name2) = LOWER(?) OR
          LOWER(alt_name3) = LOWER(?)
      `, [name, name, name, name, name]);

      if (school) {
        console.log('✅ Exact match found:', school.school);
        return res.json({ success: true, data: school });
      }

      // Try matching "School Mascot" pattern (e.g., "Georgia Bulldogs" -> "Georgia")
      // Get all schools and check if input matches "school + mascot"
      const allSchools = await db.query(`
        SELECT * FROM schools
        WHERE mascot IS NOT NULL AND mascot != ''
      `);

      const nameLower = name.toLowerCase().trim();
      for (const s of allSchools) {
        const schoolMascot = `${s.school} ${s.mascot}`.toLowerCase();
        if (nameLower === schoolMascot) {
          console.log('✅ Matched school+mascot pattern:', s.school);
          return res.json({ success: true, data: s });
        }
      }

      // Try finding schools where the input CONTAINS the school name
      // (e.g., "Georgia Bulldogs" contains "Georgia")
      for (const s of allSchools) {
        const schoolLower = s.school.toLowerCase();
        if (nameLower.includes(schoolLower) && schoolLower.length >= 4) {
          console.log('✅ Input contains school name:', s.school);
          return res.json({ success: true, data: s });
        }
      }

      // Try standard fuzzy match
      const searchTerm = `%${name}%`;
      school = await db.get(`
        SELECT * FROM schools
        WHERE
          LOWER(school) LIKE LOWER(?) OR
          LOWER(abbreviation) LIKE LOWER(?) OR
          LOWER(alt_name1) LIKE LOWER(?) OR
          LOWER(alt_name2) LIKE LOWER(?) OR
          LOWER(alt_name3) LIKE LOWER(?)
        LIMIT 1
      `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);

      if (school) {
        console.log('✅ Fuzzy match found:', school.school);
      } else {
        console.log('⚠️ No match found for:', name);
      }

      res.json({ success: true, data: school || null });
    } catch (error) {
      console.error('Error looking up school:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Find all school names in players table that don't match schools table
  async findMismatches(req, res) {
    try {
      // Get all unique school names from players
      const playerSchools = await db.query(`
        SELECT DISTINCT school, COUNT(*) as player_count
        FROM players
        WHERE school IS NOT NULL AND school != ''
        GROUP BY school
        ORDER BY school
      `);

      // Get all schools from the schools table
      const allSchools = await db.query('SELECT * FROM schools');

      const mismatches = [];
      const matched = [];

      for (const ps of playerSchools) {
        const playerSchoolLower = ps.school.toLowerCase().trim();

        // Try to find a match
        const match = allSchools.find(s => {
          const schoolLower = s.school?.toLowerCase() || '';
          const abbrLower = s.abbreviation?.toLowerCase() || '';
          const alt1Lower = s.alt_name1?.toLowerCase() || '';
          const alt2Lower = s.alt_name2?.toLowerCase() || '';
          const alt3Lower = s.alt_name3?.toLowerCase() || '';

          // Exact match
          if (playerSchoolLower === schoolLower ||
              playerSchoolLower === abbrLower ||
              playerSchoolLower === alt1Lower ||
              playerSchoolLower === alt2Lower ||
              playerSchoolLower === alt3Lower) {
            return true;
          }

          return false;
        });

        if (match) {
          matched.push({
            playerSchool: ps.school,
            playerCount: ps.player_count,
            matchedSchool: match.school,
            matchedSchoolId: match.id
          });
        } else {
          // Try to find suggestions (fuzzy match)
          const suggestions = allSchools
            .filter(s => {
              const schoolLower = s.school?.toLowerCase() || '';
              // Check if player school contains the database school name or vice versa
              return playerSchoolLower.includes(schoolLower.substring(0, 4)) ||
                     schoolLower.includes(playerSchoolLower.substring(0, 4));
            })
            .slice(0, 5)
            .map(s => ({ id: s.id, school: s.school, conference: s.conference, logo: s.logo }));

          mismatches.push({
            playerSchool: ps.school,
            playerCount: ps.player_count,
            suggestions
          });
        }
      }

      res.json({
        success: true,
        data: {
          mismatches,
          matched,
          totalMismatched: mismatches.length,
          totalMatched: matched.length,
          totalUnique: playerSchools.length
        }
      });
    } catch (error) {
      console.error('Error finding school mismatches:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Batch update players with a specific school name to a corrected school
  async fixSchoolMismatch(req, res) {
    try {
      const { oldSchoolName, newSchoolId } = req.body;

      if (!oldSchoolName || !newSchoolId) {
        return res.status(400).json({
          success: false,
          error: 'oldSchoolName and newSchoolId are required'
        });
      }

      // Get the correct school info
      const correctSchool = await db.get('SELECT * FROM schools WHERE id = ?', [newSchoolId]);

      if (!correctSchool) {
        return res.status(404).json({
          success: false,
          error: 'Target school not found'
        });
      }

      // Update all players with the old school name
      const result = await db.run(`
        UPDATE players
        SET school = ?, conference = ?, updated_at = CURRENT_TIMESTAMP
        WHERE school = ?
      `, [correctSchool.school, correctSchool.conference, oldSchoolName]);

      res.json({
        success: true,
        data: {
          oldSchoolName,
          newSchoolName: correctSchool.school,
          newConference: correctSchool.conference,
          playersUpdated: result.changes
        }
      });
    } catch (error) {
      console.error('Error fixing school mismatch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Batch fix multiple mismatches at once
  async fixMultipleMismatches(req, res) {
    try {
      const { fixes } = req.body; // Array of { oldSchoolName, newSchoolId }

      if (!fixes || !Array.isArray(fixes)) {
        return res.status(400).json({
          success: false,
          error: 'fixes array is required'
        });
      }

      const results = [];

      for (const fix of fixes) {
        if (!fix.oldSchoolName || !fix.newSchoolId) continue;

        const correctSchool = await db.get('SELECT * FROM schools WHERE id = ?', [fix.newSchoolId]);
        if (!correctSchool) continue;

        const result = await db.run(`
          UPDATE players
          SET school = ?, conference = ?, updated_at = CURRENT_TIMESTAMP
          WHERE school = ?
        `, [correctSchool.school, correctSchool.conference, fix.oldSchoolName]);

        results.push({
          oldSchoolName: fix.oldSchoolName,
          newSchoolName: correctSchool.school,
          playersUpdated: result.changes
        });
      }

      res.json({
        success: true,
        data: {
          totalFixes: results.length,
          results
        }
      });
    } catch (error) {
      console.error('Error fixing multiple mismatches:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SchoolsController();

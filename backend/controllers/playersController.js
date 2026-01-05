const db = require('../database/db');
const axios = require('axios');
const cheerio = require('cheerio');

class PlayersController {
  // Get all players with optional filters
  async getAllPlayers(req, res) {
    try {
      const {
        status,
        position,
        school,
        conference,
        agent,
        year,
        search,
        sortBy,  // 'lastName' or 'firstName' (default: lastName)
        limit,
        page
      } = req.query;

      const params = [];

      // When filtering by year, use cycle-specific status; otherwise use final status
      let sql;
      if (year) {
        sql = `
          SELECT
            p.*,
            GROUP_CONCAT(DISTINCT a.name) as agents,
            COUNT(DISTINCT pm.id) as materials_count,
            prc.status as outcome_status,
            COALESCE(po.draft_round, p.draft_round) as draft_round,
            COALESCE(po.draft_year, p.draft_year) as draft_year,
            po.signed_team as team
          FROM players p
          INNER JOIN player_recruiting_cycles prc ON p.id = prc.player_id AND prc.recruiting_year = ?
          LEFT JOIN player_agents pa ON p.id = pa.player_id
          LEFT JOIN agents a ON pa.agent_id = a.id
          LEFT JOIN player_materials pm ON p.id = pm.player_id
          LEFT JOIN player_outcomes po ON p.id = po.player_id
          WHERE 1=1
        `;
        params.push(year);
      } else {
        sql = `
          SELECT
            p.*,
            GROUP_CONCAT(DISTINCT a.name) as agents,
            COUNT(DISTINCT pm.id) as materials_count,
            COALESCE(po.status, p.status) as outcome_status,
            COALESCE(po.draft_round, p.draft_round) as draft_round,
            COALESCE(po.draft_year, p.draft_year) as draft_year,
            po.signed_team as team
          FROM players p
          LEFT JOIN player_agents pa ON p.id = pa.player_id
          LEFT JOIN agents a ON pa.agent_id = a.id
          LEFT JOIN player_materials pm ON p.id = pm.player_id
          LEFT JOIN player_outcomes po ON p.id = po.player_id
          WHERE 1=1
        `;
      }

      if (status) {
        if (year) {
          // Filter by cycle-specific status
          sql += ' AND prc.status = ?';
        } else {
          sql += ' AND COALESCE(po.status, p.status) = ?';
        }
        params.push(status);
      }

      if (position) {
        sql += ' AND p.position = ?';
        params.push(position);
      }

      if (school) {
        sql += ' AND p.school LIKE ?';
        params.push(`%${school}%`);
      }

      if (conference) {
        sql += ' AND p.conference = ?';
        params.push(conference);
      }

      if (search) {
        sql += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
      }

      // Sort by last name (default) or first name
      const orderColumn = sortBy === 'firstName' ? 'p.first_name' : 'p.last_name';
      sql += ` GROUP BY p.id ORDER BY ${orderColumn}, p.name`;

      // Build a proper count query
      let countSql;
      const countParams = [...params];
      if (year) {
        countSql = `
          SELECT COUNT(DISTINCT p.id) as total
          FROM players p
          INNER JOIN player_recruiting_cycles prc ON p.id = prc.player_id AND prc.recruiting_year = ?
          LEFT JOIN player_outcomes po ON p.id = po.player_id
          WHERE 1=1
        `;
        if (status) countSql += ' AND prc.status = ?';
      } else {
        countSql = `
          SELECT COUNT(DISTINCT p.id) as total
          FROM players p
          LEFT JOIN player_outcomes po ON p.id = po.player_id
          WHERE 1=1
        `;
        if (status) countSql += ' AND COALESCE(po.status, p.status) = ?';
      }
      if (position) countSql += ' AND p.position = ?';
      if (school) countSql += ' AND p.school LIKE ?';
      if (conference) countSql += ' AND p.conference = ?';
      if (search) countSql += ' AND p.name LIKE ?';

      let total = 0;
      try {
        const countResult = await db.get(countSql, countParams);
        total = countResult?.total || 0;
      } catch (e) {
        console.error('Count query error:', e);
      }

      // Apply pagination
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 50;
      const offset = (pageNum - 1) * limitNum;

      if (limit && !isNaN(limitNum)) {
        sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
      }

      const players = await db.query(sql, params);
      res.json({ success: true, data: players, total, page: pageNum, limit: limitNum });
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get single player with full details
  async getPlayer(req, res) {
    try {
      const { id } = req.params;

      const player = await db.get(
        'SELECT * FROM players WHERE id = ?',
        [id]
      );

      if (!player) {
        return res.status(404).json({ 
          success: false, 
          error: 'Player not found' 
        });
      }

      // Get agents
      const agents = await db.query(`
        SELECT a.* 
        FROM agents a
        JOIN player_agents pa ON a.id = pa.agent_id
        WHERE pa.player_id = ?
      `, [id]);

      // Get materials
      const materials = await db.query(`
        SELECT 
          pm.*,
          mt.name as material_type_name,
          mt.category,
          a.name as agent_name
        FROM player_materials pm
        JOIN material_types mt ON pm.material_type_id = mt.id
        LEFT JOIN agents a ON pm.agent_id = a.id
        WHERE pm.player_id = ?
        ORDER BY pm.delivery_date DESC
      `, [id]);

      // Get contacts
      const contacts = await db.query(`
        SELECT 
          pc.*,
          a.name as agent_name
        FROM player_contacts pc
        LEFT JOIN agents a ON pc.agent_id = a.id
        WHERE pc.player_id = ?
        ORDER BY pc.contact_date DESC
      `, [id]);

      // Get outcome
      const outcome = await db.get(
        'SELECT * FROM player_outcomes WHERE player_id = ?',
        [id]
      );

      // Get transfer history
      const transfers = await db.query(`
        SELECT * FROM player_transfers
        WHERE player_id = ?
        ORDER BY transfer_year DESC
      `, [id]);

      // Get recruiting cycles this player is associated with
      const recruitingCycles = await db.query(`
        SELECT recruiting_year FROM player_recruiting_cycles
        WHERE player_id = ?
        ORDER BY recruiting_year DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          ...player,
          agents,
          materials,
          contacts,
          outcome,
          transfers,
          recruiting_cycles: recruitingCycles.map(r => r.recruiting_year)
        }
      });
    } catch (error) {
      console.error('Error fetching player:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create new player
  async createPlayer(req, res) {
    try {
      const playerData = req.body;

      // Check if player with this ESPN ID already exists
      if (playerData.espn_id) {
        const existingPlayer = await db.get(
          'SELECT id, name, school FROM players WHERE espn_id = ?',
          [playerData.espn_id]
        );

        if (existingPlayer) {
          return res.status(409).json({
            success: false,
            error: 'Player already exists',
            message: `${existingPlayer.name} (${existingPlayer.school}) is already in the database`,
            existingPlayerId: existingPlayer.id
          });
        }
      }

      // Determine default status based on player type
      let defaultStatus = 'Active';
      if (playerData.player_type === 'veteran') {
        defaultStatus = 'Not Signed';
      }

      const result = await db.run(`
        INSERT INTO players (
          name, position, school, conference, hometown, state,
          height, weight, class_year, eligibility_year,
          photo_url, espn_id, status,
          high_school, recruiting_class_year, recruiting_stars,
          recruiting_rating, recruiting_ranking, recruiting_state_ranking,
          recruiting_position_ranking, original_commitment,
          player_type, recruiting_cycle_year, eligibility_number,
          nfl_team, years_pro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        playerData.name,
        playerData.position,
        playerData.school || null,
        playerData.conference || null,
        playerData.hometown || null,
        playerData.state || null,
        playerData.height || null,
        playerData.weight || null,
        playerData.class_year || null,
        playerData.eligibility_year || null,
        playerData.photo_url || null,
        playerData.espn_id || null,
        playerData.status || defaultStatus,
        playerData.high_school || null,
        playerData.recruiting_class_year || null,
        playerData.recruiting_stars || null,
        playerData.recruiting_rating || null,
        playerData.recruiting_ranking || null,
        playerData.recruiting_state_ranking || null,
        playerData.recruiting_position_ranking || null,
        playerData.original_commitment || null,
        playerData.player_type || 'college',
        playerData.recruiting_cycle_year || null,
        playerData.eligibility_number || null,
        playerData.nfl_team || null,
        playerData.years_pro || null
      ]);

      res.json({
        success: true,
        data: { id: result.id, ...playerData }
      });
    } catch (error) {
      console.error('Error creating player:', error);

      // Handle SQLITE_CONSTRAINT errors specifically
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
          success: false,
          error: 'Duplicate player',
          message: 'A player with this information already exists in the database'
        });
      }

      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update player
  async updatePlayer(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const fields = [];
      const values = [];

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No fields to update' 
        });
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await db.run(
        `UPDATE players SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ success: true, message: 'Player updated' });
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Delete player
  async deletePlayer(req, res) {
    try {
      const { id } = req.params;

      await db.run('DELETE FROM players WHERE id = ?', [id]);

      res.json({ success: true, message: 'Player deleted' });
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Search ESPN for player data
  async searchESPN(req, res) {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name parameter required'
        });
      }

      console.log('🔍 Searching ESPN for:', name);

      // Use ESPN's search/autocomplete API
      const searchResponse = await axios.get(
        'https://site.web.api.espn.com/apis/search/v2',
        {
          params: {
            region: 'us',
            lang: 'en',
            query: name,
            type: 'player',
            sport: 'football',
            league: 'college-football',
            limit: 20
          }
        }
      );

      console.log('📊 ESPN Response structure:', Object.keys(searchResponse.data));
      console.log('📊 Full ESPN Response:', JSON.stringify(searchResponse.data, null, 2));

      // Extract player results - ESPN returns nested structure
      const resultGroups = searchResponse.data?.results || [];

      // Flatten all player contents from all result groups
      let allPlayers = [];
      resultGroups.forEach(group => {
        if (group.type === 'player' && group.contents) {
          allPlayers = allPlayers.concat(group.contents);
        }
      });

      console.log('👥 Found', allPlayers.length, 'players');
      if (allPlayers.length > 0) {
        console.log('🏈 First player data:', JSON.stringify(allPlayers[0], null, 2));
      }

      // Format results for frontend
      const formattedPlayers = allPlayers.map(player => {
        // Extract player ID from UID (format: s:20~l:23~a:4602019)
        const playerId = player.uid?.split('~a:')[1] || player.id;

        const formatted = {
          id: playerId,
          name: player.displayName || player.name,
          position: player.position?.abbreviation || player.position,
          school: player.subtitle, // ESPN uses subtitle for team/school
          sport: player.sport,
          league: player.defaultLeagueSlug,
          image: player.image?.default || player.image?.defaultDark,
          url: player.link?.web
        };
        console.log('✨ Formatted:', formatted);
        return formatted;
      });

      console.log('✅ Returning', formattedPlayers.length, 'formatted players');

      res.json({ success: true, data: formattedPlayers });
    } catch (error) {
      console.error('Error searching ESPN:', error.message);
      res.status(500).json({
        success: false,
        error: 'ESPN API error',
        message: error.message
      });
    }
  }

  // Search ESPN for NFL player data (veterans)
  async searchNFL(req, res) {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name parameter required'
        });
      }

      console.log('🏈 Searching ESPN NFL for:', name);

      // Use ESPN's search/autocomplete API for NFL
      const searchResponse = await axios.get(
        'https://site.web.api.espn.com/apis/search/v2',
        {
          params: {
            region: 'us',
            lang: 'en',
            query: name,
            type: 'player',
            sport: 'football',
            league: 'nfl',
            limit: 20
          }
        }
      );

      // Extract player results - ESPN returns nested structure
      const resultGroups = searchResponse.data?.results || [];

      // Flatten all player contents from all result groups
      let allPlayers = [];
      resultGroups.forEach(group => {
        if (group.type === 'player' && group.contents) {
          allPlayers = allPlayers.concat(group.contents);
        }
      });

      console.log('👥 Found', allPlayers.length, 'NFL players');

      // Format results for frontend
      const formattedPlayers = allPlayers.map(player => {
        // Extract player ID from UID (format: s:20~l:28~a:4602019)
        const playerId = player.uid?.split('~a:')[1] || player.id;

        return {
          id: playerId,
          name: player.displayName || player.name,
          position: player.position?.abbreviation || player.position,
          team: player.subtitle, // ESPN uses subtitle for team
          sport: player.sport,
          league: player.defaultLeagueSlug,
          image: player.image?.default || player.image?.defaultDark,
          url: player.link?.web
        };
      });

      console.log('✅ Returning', formattedPlayers.length, 'NFL players');

      res.json({ success: true, data: formattedPlayers });
    } catch (error) {
      console.error('Error searching ESPN NFL:', error.message);
      res.status(500).json({
        success: false,
        error: 'ESPN NFL API error',
        message: error.message
      });
    }
  }

  // Get detailed NFL player data from ESPN by ID
  async getNFLPlayerDetails(req, res) {
    try {
      const { id } = req.params;

      console.log('🏈 Fetching NFL player details for ID:', id);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Player ID required'
        });
      }

      // Get NFL player profile from ESPN
      const profileUrl = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}`;
      const profileResponse = await axios.get(profileUrl);
      const athlete = profileResponse.data?.athlete;

      if (!athlete) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }

      // Extract relevant data
      const playerData = {
        id: athlete.id,
        name: athlete.displayName,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        position: athlete.position?.abbreviation,
        team: athlete.team?.displayName,
        teamAbbr: athlete.team?.abbreviation,
        jersey: athlete.jersey,
        height: athlete.displayHeight,
        weight: athlete.displayWeight,
        age: athlete.age,
        birthPlace: athlete.birthPlace?.city && athlete.birthPlace?.state
          ? `${athlete.birthPlace.city}, ${athlete.birthPlace.state}`
          : null,
        college: athlete.college?.name,
        experience: athlete.experience?.years,
        photo_url: athlete.headshot?.href,
        status: athlete.status?.type
      };

      console.log('✅ NFL player data:', playerData);

      res.json({ success: true, data: playerData });
    } catch (error) {
      console.error('Error fetching NFL player details:', error.message);
      res.status(500).json({
        success: false,
        error: 'ESPN NFL API error',
        message: error.message
      });
    }
  }

  // Get detailed player data from ESPN by ID
  async getESPNPlayerDetails(req, res) {
    try {
      const { id } = req.params;

      console.log('🔍 Fetching ESPN player details for ID:', id);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Player ID required'
        });
      }

      // Fetch player details from ESPN
      const response = await axios.get(
        `https://site.api.espn.com/apis/site/v2/sports/football/college-football/athletes/${id}`
      );

      console.log('📊 ESPN Player Response structure:', Object.keys(response.data));
      console.log('📊 Full Player Response:', JSON.stringify(response.data, null, 2));

      const player = response.data?.athlete;

      if (!player) {
        console.error('❌ No athlete data in response');
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }

      console.log('👤 Player data keys:', Object.keys(player));

      // Extract and format player data
      const formattedData = {
        espn_id: player.id,
        name: player.displayName || player.fullName,
        position: player.position?.abbreviation || player.position?.name,
        school: player.team?.displayName || player.team?.name,
        conference: player.team?.conferenceAbbreviation,
        height: player.displayHeight,
        weight: player.displayWeight,
        class_year: player.experience?.displayValue || player.class,
        hometown: player.birthPlace?.city,
        state: player.birthPlace?.state,
        photo_url: player.headshot?.href || player.headshot?.url,
        jersey: player.jersey,
        // Additional data
        age: player.age,
        dateOfBirth: player.dateOfBirth,
        slug: player.slug,
        links: player.links
      };

      console.log('✅ Formatted player data:', formattedData);

      res.json({ success: true, data: formattedData });
    } catch (error) {
      console.error('❌ Error fetching ESPN player details:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      res.status(500).json({
        success: false,
        error: 'ESPN API error',
        message: error.message,
        details: error.response?.data || error.toString()
      });
    }
  }

  // Assign agent to player
  async assignAgent(req, res) {
    try {
      const { playerId, agentId, isPrimary } = req.body;

      await db.run(`
        INSERT OR REPLACE INTO player_agents (player_id, agent_id, is_primary)
        VALUES (?, ?, ?)
      `, [playerId, agentId, isPrimary ? 1 : 0]);

      res.json({ success: true, message: 'Agent assigned' });
    } catch (error) {
      console.error('Error assigning agent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Remove agent from player
  async removeAgent(req, res) {
    try {
      const { playerId, agentId } = req.body;

      if (!playerId || !agentId) {
        return res.status(400).json({
          success: false,
          error: 'playerId and agentId are required'
        });
      }

      const result = await db.run(`
        DELETE FROM player_agents
        WHERE player_id = ? AND agent_id = ?
      `, [playerId, agentId]);

      res.json({
        success: true,
        message: 'Agent removed from player',
        changes: result.changes
      });
    } catch (error) {
      console.error('Error removing agent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get analytics data
  async getAnalytics(req, res) {
    try {
      const { year } = req.query;

      // Get available recruiting years
      const recruitingYears = await db.query(`
        SELECT DISTINCT recruiting_year
        FROM player_recruiting_cycles
        ORDER BY recruiting_year DESC
      `);

      // Overall stats (consolidated: Signed, Not Signed, Returned to School)
      // Use cycle-specific status when filtering by year
      let overallStats;
      if (year) {
        overallStats = await db.get(`
          SELECT
            COUNT(*) as total_players,
            COUNT(CASE WHEN prc.status = 'Signed' THEN 1 END) as signed,
            COUNT(CASE WHEN prc.status IN ('Not Signed', 'Missed', 'Walked Away', 'No Meeting') THEN 1 END) as not_signed,
            COUNT(CASE WHEN prc.status = 'Returned to School' THEN 1 END) as returned
          FROM players p
          INNER JOIN player_recruiting_cycles prc ON p.id = prc.player_id AND prc.recruiting_year = ?
        `, [year]);
      } else {
        overallStats = await db.get(`
          SELECT
            COUNT(*) as total_players,
            COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed,
            COUNT(CASE WHEN po.status IN ('Not Signed', 'Missed', 'Walked Away', 'No Meeting') THEN 1 END) as not_signed,
            COUNT(CASE WHEN po.status = 'Returned to School' THEN 1 END) as returned
          FROM players p
          LEFT JOIN player_outcomes po ON p.id = po.player_id
        `);
      }

      // By position
      let byPosition;
      if (year) {
        byPosition = await db.query(`
          SELECT
            p.position,
            COUNT(*) as count,
            COUNT(CASE WHEN prc.status = 'Signed' THEN 1 END) as signed
          FROM players p
          INNER JOIN player_recruiting_cycles prc ON p.id = prc.player_id AND prc.recruiting_year = ?
          GROUP BY p.position
          ORDER BY count DESC
        `, [year]);
      } else {
        byPosition = await db.query(`
          SELECT
            p.position,
            COUNT(*) as count,
            COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed
          FROM players p
          LEFT JOIN player_outcomes po ON p.id = po.player_id
          GROUP BY p.position
          ORDER BY count DESC
        `);
      }

      // By conference
      let byConference;
      if (year) {
        byConference = await db.query(`
          SELECT
            p.conference,
            COUNT(*) as count,
            COUNT(CASE WHEN prc.status = 'Signed' THEN 1 END) as signed
          FROM players p
          INNER JOIN player_recruiting_cycles prc ON p.id = prc.player_id AND prc.recruiting_year = ?
          GROUP BY p.conference
          ORDER BY count DESC
        `, [year]);
      } else {
        byConference = await db.query(`
          SELECT
            p.conference,
            COUNT(*) as count,
            COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed
          FROM players p
          LEFT JOIN player_outcomes po ON p.id = po.player_id
          GROUP BY p.conference
          ORDER BY count DESC
        `);
      }

      // Materials usage
      const materialsUsage = await db.query(`
        SELECT 
          mt.name,
          COUNT(*) as usage_count,
          COUNT(DISTINCT pm.player_id) as unique_players
        FROM material_types mt
        LEFT JOIN player_materials pm ON mt.id = pm.material_type_id
        GROUP BY mt.id
        ORDER BY usage_count DESC
        LIMIT 20
      `);

      res.json({
        success: true,
        data: {
          overall: overallStats,
          byPosition,
          byConference,
          materialsUsage,
          recruitingYears: recruitingYears.map(r => r.recruiting_year)
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Search CFBD for player details
  async searchCFBD(req, res) {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name parameter required'
        });
      }

      const apiKey = process.env.CFBD_API_KEY;
      if (!apiKey) {
        console.error('⚠️ CFBD_API_KEY not configured');
        return res.status(500).json({
          success: false,
          error: 'CFBD API key not configured'
        });
      }

      console.log('🔍 Searching CFBD for:', name);

      const response = await axios.get(
        'https://api.collegefootballdata.com/player/search',
        {
          params: {
            searchTerm: name
          },
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      const players = response.data || [];
      console.log('👥 Found', players.length, 'players from CFBD');

      if (players.length > 0) {
        console.log('🏈 First player:', JSON.stringify(players[0], null, 2));
      }

      // Format the response
      const formattedPlayers = players.map(player => {
        // Parse hometown into city and state
        let hometown = '';
        let state = '';
        if (player.home_town) {
          const parts = player.home_town.split(',').map(p => p.trim());
          hometown = parts[0] || '';
          state = parts[1] || '';
        }

        return {
          id: player.athlete_id,
          name: player.name,
          firstName: player.first_name,
          lastName: player.last_name,
          position: player.position,
          height: player.height,
          weight: player.weight,
          jersey: player.jersey,
          school: player.team,
          hometown: hometown,
          state: state,
          teamColor: player.team_color,
          teamColorSecondary: player.team_color_secondary
        };
      });

      res.json({ success: true, data: formattedPlayers });
    } catch (error) {
      console.error('Error searching CFBD:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get recruiting data from CFBD for additional details (hometown, class year)
  async getRecruitingData(req, res) {
    try {
      const { name, team, year } = req.query;

      if (!name || (!team && !year)) {
        return res.status(400).json({
          success: false,
          error: 'Name and either team or year required'
        });
      }

      const apiKey = process.env.CFBD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'CFBD API key not configured'
        });
      }

      console.log('🎓 Searching CFBD recruiting for:', name, 'team:', team, 'year:', year);

      let allRecruits = [];

      // Try searching by team first
      if (team) {
        try {
          const response = await axios.get(
            'https://api.collegefootballdata.com/recruiting/players',
            {
              params: { team },
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }
          );
          allRecruits = response.data || [];
          console.log('📊 Team search returned', allRecruits.length, 'total recruits');
        } catch (teamError) {
          console.warn('⚠️ Team search failed:', teamError.message);
        }
      }

      // If team search returned nothing, try recent years
      if (allRecruits.length === 0) {
        console.log('🔄 Trying year-based search for recent recruiting classes...');
        const currentYear = new Date().getFullYear();
        const yearsToTry = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

        for (const searchYear of yearsToTry) {
          try {
            console.log(`  Trying year ${searchYear} with team filter...`);
            const response = await axios.get(
              'https://api.collegefootballdata.com/recruiting/players',
              {
                params: { year: searchYear, team: team || undefined },
                headers: { 'Authorization': `Bearer ${apiKey}` }
              }
            );
            const yearRecruits = response.data || [];
            allRecruits = allRecruits.concat(yearRecruits);
            console.log(`  Year ${searchYear}: found ${yearRecruits.length} recruits`);
          } catch (yearError) {
            console.warn(`  Year ${searchYear} failed:`, yearError.message);
          }
        }
        console.log('📊 Total recruits from all years:', allRecruits.length);
      }

      // Find matching player by name
      const nameToMatch = name.toLowerCase().trim();
      let matchingRecruits = allRecruits.filter(recruit => {
        const recruitName = recruit.name?.toLowerCase().trim() || '';
        return recruitName.includes(nameToMatch) || nameToMatch.includes(recruitName);
      });

      console.log('✅ Found', matchingRecruits.length, 'matching recruits');

      // If no matches found with team filter, try searching without team (for transfer players)
      if (matchingRecruits.length === 0 && team) {
        console.log('🔄 No matches with team filter. Trying without team for transfer players...');
        const currentYear = new Date().getFullYear();
        const yearsToTry = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5, currentYear - 6];

        allRecruits = [];
        for (const searchYear of yearsToTry) {
          try {
            console.log(`  Trying year ${searchYear} without team filter...`);
            const response = await axios.get(
              'https://api.collegefootballdata.com/recruiting/players',
              {
                params: { year: searchYear },
                headers: { 'Authorization': `Bearer ${apiKey}` }
              }
            );
            const yearRecruits = response.data || [];
            allRecruits = allRecruits.concat(yearRecruits);
            console.log(`  Year ${searchYear}: found ${yearRecruits.length} recruits`);
          } catch (yearError) {
            console.warn(`  Year ${searchYear} failed:`, yearError.message);
          }
        }

        console.log('📊 Total recruits from all years (no team filter):', allRecruits.length);

        // Search again by name only
        matchingRecruits = allRecruits.filter(recruit => {
          const recruitName = recruit.name?.toLowerCase().trim() || '';
          return recruitName.includes(nameToMatch) || nameToMatch.includes(recruitName);
        });

        console.log('✅ Found', matchingRecruits.length, 'matching recruits (transfer search)');
      }

      if (matchingRecruits.length > 0) {
        // Format recruiting data
        const formattedRecruits = matchingRecruits.map(recruit => ({
          name: recruit.name,
          position: recruit.position,
          height: recruit.height,
          weight: recruit.weight,
          stars: recruit.stars,
          rating: recruit.rating,
          school: recruit.committedTo,
          hometown: recruit.city,
          state: recruit.stateProvince,
          country: recruit.country,
          recruitingYear: recruit.year,
          classYear: recruit.year, // Year they were recruited = freshman year
          ranking: recruit.ranking,
          athleteId: recruit.athleteId
        }));

        res.json({ success: true, data: formattedRecruits });
      } else {
        res.json({ success: true, data: [] });
      }
    } catch (error) {
      console.error('Error fetching CFBD recruiting data:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get transfer portal data from CFBD
  async getTransferData(req, res) {
    try {
      const { name, year, school, recruitingYear } = req.query;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Player name required'
        });
      }

      const apiKey = process.env.CFBD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'CFBD API key not configured'
        });
      }

      console.log('🔄 Fetching transfer portal data for:', name, 'school:', school, 'recruitingYear:', recruitingYear);

      // Determine years to search based on available data
      const currentYear = new Date().getFullYear();
      let yearsToTry;

      if (year) {
        // If specific year provided, use that
        yearsToTry = [parseInt(year)];
        console.log('📅 Using specific year:', year);
      } else if (recruitingYear) {
        // If recruiting year available, search forward from signing year (covers full college career)
        const startYear = parseInt(recruitingYear);
        // Search 8 years forward to cover redshirts, grad transfers, etc.
        yearsToTry = [];
        for (let y = startYear; y <= startYear + 8; y++) {
          yearsToTry.push(y);
        }
        console.log('📅 Searching from recruiting year forward (8 years):', yearsToTry);
      } else {
        // Fall back to searching backwards from current year - extend to 10 years for older players
        yearsToTry = [];
        for (let y = currentYear; y >= currentYear - 10; y--) {
          yearsToTry.push(y);
        }
        console.log('📅 Searching backwards from current year (10 years):', yearsToTry);
      }

      let allTransfers = [];

      for (const searchYear of yearsToTry) {
        try {
          console.log(`  Checking transfer portal for year ${searchYear}...`);
          const response = await axios.get(
            'https://api.collegefootballdata.com/player/portal',
            {
              params: { year: searchYear },
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }
          );

          const yearTransfers = response.data || [];
          allTransfers = allTransfers.concat(yearTransfers);
          console.log(`  Found ${yearTransfers.length} transfers in ${searchYear}`);
        } catch (yearError) {
          console.warn(`  Year ${searchYear} failed:`, yearError.message);
        }
      }

      // Find matching player by name match (with nickname support)
      const nameToMatch = name.toLowerCase().trim();
      const nameParts = nameToMatch.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];

      // Common nickname mappings for name matching
      const nicknameMap = {
        'zachariah': ['zach', 'zachary', 'zac'],
        'zach': ['zachariah', 'zachary', 'zac'],
        'zachary': ['zach', 'zachariah', 'zac'],
        'michael': ['mike', 'mikey'],
        'mike': ['michael', 'mikey'],
        'william': ['will', 'bill', 'billy', 'willy'],
        'will': ['william', 'bill', 'billy'],
        'robert': ['rob', 'bob', 'bobby', 'robby'],
        'rob': ['robert', 'bob', 'bobby'],
        'christopher': ['chris', 'topher'],
        'chris': ['christopher', 'topher'],
        'matthew': ['matt', 'matty'],
        'matt': ['matthew', 'matty'],
        'jonathan': ['jon', 'john', 'johnny'],
        'jon': ['jonathan', 'john', 'johnny'],
        'john': ['jonathan', 'jon', 'johnny'],
        'joshua': ['josh'],
        'josh': ['joshua'],
        'nicholas': ['nick', 'nicky'],
        'nick': ['nicholas', 'nicky'],
        'anthony': ['tony', 'ant'],
        'tony': ['anthony'],
        'benjamin': ['ben', 'benny'],
        'ben': ['benjamin', 'benny'],
        'alexander': ['alex', 'xander'],
        'alex': ['alexander', 'xander'],
        'daniel': ['dan', 'danny'],
        'dan': ['daniel', 'danny'],
        'joseph': ['joe', 'joey'],
        'joe': ['joseph', 'joey'],
        'james': ['jim', 'jimmy', 'jamie'],
        'jim': ['james', 'jimmy'],
        'david': ['dave', 'davey'],
        'dave': ['david', 'davey'],
        'thomas': ['tom', 'tommy'],
        'tom': ['thomas', 'tommy'],
        'richard': ['rick', 'dick', 'ricky'],
        'rick': ['richard', 'ricky'],
        'samuel': ['sam', 'sammy'],
        'sam': ['samuel', 'sammy'],
        'timothy': ['tim', 'timmy'],
        'tim': ['timothy', 'timmy'],
        'edward': ['ed', 'eddie', 'ted', 'teddy'],
        'ed': ['edward', 'eddie'],
        'charles': ['charlie', 'chuck'],
        'charlie': ['charles', 'chuck'],
        'isaiah': ['isa']
      };

      // Check if first names match (including nicknames)
      const firstNameMatches = (name1, name2) => {
        if (name1 === name2) return true;
        const nicknames1 = nicknameMap[name1] || [];
        const nicknames2 = nicknameMap[name2] || [];
        return nicknames1.includes(name2) || nicknames2.includes(name1);
      };

      let matchingTransfers = allTransfers.filter(transfer => {
        const transferFullName = `${transfer.firstName} ${transfer.lastName}`.toLowerCase().trim();
        const transferFirstName = transfer.firstName?.toLowerCase().trim() || '';
        const transferLastName = transfer.lastName?.toLowerCase().trim() || '';

        // Exact full name match
        const exactMatch = transferFullName === nameToMatch;
        // Exact first/last match
        const firstLastMatch = transferFirstName === firstName && transferLastName === lastName;
        // Nickname-aware first name match with exact last name
        const nicknameMatch = transferLastName === lastName && firstNameMatches(transferFirstName, firstName);

        return exactMatch || firstLastMatch || nicknameMatch;
      });

      console.log('📊 Found', matchingTransfers.length, 'name matches (with nickname support)');

      // If we have a current school, try to BUILD a transfer chain
      if (school && matchingTransfers.length > 0) {
        console.log('🏫 Building transfer chain for player at:', school);
        console.log('   Matching transfers to verify:', matchingTransfers.map(t => `${t.origin} → ${t.destination}`).join(', '));
        const schoolLower = school.toLowerCase();

        // Strategy 1: Build chain backwards from current school (transfers TO this school)
        const chainToSchool = [];
        let searchSchool = school;
        const usedTransfers = new Set();

        let foundTransfer = true;
        while (foundTransfer) {
          foundTransfer = false;

          for (let i = 0; i < matchingTransfers.length; i++) {
            if (usedTransfers.has(i)) continue;

            const transfer = matchingTransfers[i];
            const destSchool = transfer.destination?.toLowerCase() || '';
            const currentSearchSchool = searchSchool.toLowerCase();

            // Don't match if destination is empty/null - that's not a real destination
            if (!destSchool) continue;

            const matches = destSchool.includes(currentSearchSchool) || currentSearchSchool.includes(destSchool);

            if (matches) {
              console.log('  ✅ Found in chain (to school):', `${transfer.origin} → ${transfer.destination} (${transfer.season})`);
              chainToSchool.unshift(transfer);
              usedTransfers.add(i);
              searchSchool = transfer.origin;
              foundTransfer = true;
              break;
            }
          }
        }

        // Strategy 2: If no chain TO school, check for transfers FROM this school
        // This handles cases where the player has since transferred away (e.g., Hudson Card at Texas)
        if (chainToSchool.length === 0) {
          console.log('🔄 No chain to school found. Checking for transfers FROM school...');

          // Find all transfers where origin matches current school
          const transfersFromSchool = matchingTransfers.filter(t => {
            const originSchool = t.origin?.toLowerCase() || '';
            if (!originSchool) return false; // Don't match empty origins
            return originSchool.includes(schoolLower) || schoolLower.includes(originSchool);
          });

          if (transfersFromSchool.length > 0) {
            console.log('  ✅ Found', transfersFromSchool.length, 'transfers FROM', school);

            // Build forward chain from this school
            const chainFromSchool = [];
            let currentSchool = school;
            const usedFromTransfers = new Set();

            foundTransfer = true;
            while (foundTransfer) {
              foundTransfer = false;

              for (let i = 0; i < matchingTransfers.length; i++) {
                if (usedFromTransfers.has(i)) continue;

                const transfer = matchingTransfers[i];
                const originSchool = transfer.origin?.toLowerCase() || '';
                const searchSchoolLower = currentSchool.toLowerCase();

                // Don't match if origin is empty/null
                if (!originSchool) continue;

                const matches = originSchool.includes(searchSchoolLower) || searchSchoolLower.includes(originSchool);

                if (matches) {
                  console.log('  ✅ Found in chain (from school):', `${transfer.origin} → ${transfer.destination} (${transfer.season})`);
                  chainFromSchool.push(transfer);
                  usedFromTransfers.add(i);
                  currentSchool = transfer.destination; // Follow the chain forward
                  foundTransfer = true;
                  break;
                }
              }
            }

            if (chainFromSchool.length > 0) {
              matchingTransfers = chainFromSchool;
              console.log('✅ Built forward chain with', matchingTransfers.length, 'transfers');
            } else {
              // Just return the transfers from this school
              matchingTransfers = transfersFromSchool;
            }
          } else {
            console.warn('⚠️ REJECTING - Could not build transfer chain - no transfers to or from current school.');
            console.warn('   Current school:', school);
            console.warn('   Available transfers:', matchingTransfers.map(t => `${t.origin} → ${t.destination}`).join(', '));

            // Return empty - don't show potentially wrong data
            console.warn('   RETURNING EMPTY ARRAY');
            return res.json({
              success: true,
              data: [],
              warning: 'Could not verify transfer chain - may be different player with same name'
            });
          }
        } else {
          // Use the chain TO school
          matchingTransfers = chainToSchool;
          console.log('✅ Built backward chain with', matchingTransfers.length, 'transfers');
        }
      }

      console.log('✅ Found', matchingTransfers.length, 'verified transfer records');

      if (matchingTransfers.length > 0) {
        // Format transfer data
        const formattedTransfers = matchingTransfers.map(transfer => ({
          playerName: `${transfer.firstName} ${transfer.lastName}`,
          fromSchool: transfer.origin,
          toSchool: transfer.destination,
          transferSeason: transfer.season,
          transferYear: parseInt(transfer.season),
          eligibilityRemaining: transfer.eligibility,
          transferType: 'Portal', // CFBD data is all portal transfers
          transferDate: transfer.transferDate
        }));

        res.json({ success: true, data: formattedTransfers });
      } else {
        res.json({ success: true, data: [] });
      }
    } catch (error) {
      console.error('Error fetching transfer data:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get player's transfer history from database
  async getPlayerTransfers(req, res) {
    try {
      const { id } = req.params;

      const transfers = await db.query(`
        SELECT * FROM player_transfers
        WHERE player_id = ?
        ORDER BY transfer_year DESC
      `, [id]);

      res.json({ success: true, data: transfers });
    } catch (error) {
      console.error('Error fetching player transfers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Add transfer to player's history
  async addPlayerTransfer(req, res) {
    try {
      const { player_id, from_school, to_school, transfer_season, transfer_year, eligibility_remaining, transfer_type } = req.body;

      if (!player_id || !to_school) {
        return res.status(400).json({
          success: false,
          error: 'player_id and to_school are required'
        });
      }

      const result = await db.run(`
        INSERT INTO player_transfers (
          player_id, from_school, to_school, transfer_season,
          transfer_year, eligibility_remaining, transfer_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        player_id,
        from_school || null,
        to_school,
        transfer_season || null,
        transfer_year || null,
        eligibility_remaining || null,
        transfer_type || 'Portal'
      ]);

      res.json({
        success: true,
        data: { id: result.id, player_id, from_school, to_school, transfer_year }
      });
    } catch (error) {
      console.error('Error adding transfer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update player outcome/status
  async updatePlayerOutcome(req, res) {
    try {
      const { id } = req.params;
      const { status, outcome_date, draft_round, draft_pick, draft_year, signed_team, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      // Update player status and draft info
      await db.run(
        `UPDATE players SET
          status = ?,
          draft_round = COALESCE(?, draft_round),
          draft_year = COALESCE(?, draft_year),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [status, draft_round || null, draft_year || null, id]
      );

      // Check if outcome record exists
      const existingOutcome = await db.get(
        'SELECT * FROM player_outcomes WHERE player_id = ?',
        [id]
      );

      if (existingOutcome) {
        // Update existing outcome
        await db.run(`
          UPDATE player_outcomes
          SET status = ?,
              outcome_date = ?,
              draft_round = ?,
              draft_pick = ?,
              draft_year = ?,
              signed_team = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE player_id = ?
        `, [status, outcome_date || null, draft_round || null, draft_pick || null,
            draft_year || null, signed_team || null, notes || null, id]);
      } else {
        // Create new outcome record
        await db.run(`
          INSERT INTO player_outcomes (
            player_id, status, outcome_date, draft_round, draft_pick, draft_year, signed_team, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, status, outcome_date || null, draft_round || null, draft_pick || null,
            draft_year || null, signed_team || null, notes || null]);
      }

      res.json({
        success: true,
        message: 'Player outcome updated successfully'
      });
    } catch (error) {
      console.error('Error updating player outcome:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Search CFBD for high school recruits
  async searchHSRecruits(req, res) {
    try {
      const { name, year, state, position } = req.query;

      if (!name && !year) {
        return res.status(400).json({
          success: false,
          error: 'Name or year parameter required'
        });
      }

      const apiKey = process.env.CFBD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'CFBD API key not configured'
        });
      }

      console.log('🎓 Searching CFBD HS recruits:', { name, year, state, position });

      // Build params for CFBD API
      const params = {};
      if (year) params.year = year;
      if (state) params.state = state;
      if (position) params.position = position;

      // If no year specified, search current and upcoming classes
      const currentYear = new Date().getFullYear();
      const yearsToSearch = year ? [parseInt(year)] : [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

      let allRecruits = [];

      for (const searchYear of yearsToSearch) {
        try {
          const response = await axios.get(
            'https://api.collegefootballdata.com/recruiting/players',
            {
              params: { ...params, year: searchYear },
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }
          );

          const yearRecruits = response.data || [];
          allRecruits = allRecruits.concat(yearRecruits);
          console.log(`  Year ${searchYear}: ${yearRecruits.length} recruits`);
        } catch (yearError) {
          console.warn(`  Year ${searchYear} failed:`, yearError.message);
        }
      }

      // Filter by name if provided
      let filteredRecruits = allRecruits;
      if (name) {
        const searchName = name.toLowerCase().trim();
        filteredRecruits = allRecruits.filter(recruit => {
          const recruitName = recruit.name?.toLowerCase() || '';
          return recruitName.includes(searchName) || searchName.includes(recruitName);
        });
      }

      // Sort by ranking (best first), then by year
      filteredRecruits.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Most recent year first
        return (a.ranking || 9999) - (b.ranking || 9999); // Best ranking first
      });

      // Limit results
      const limitedResults = filteredRecruits.slice(0, 50);

      console.log(`✅ Found ${filteredRecruits.length} matches, returning ${limitedResults.length}`);

      // Format response
      const formattedRecruits = limitedResults.map(recruit => ({
        id: recruit.id,
        athleteId: recruit.athleteId,
        name: recruit.name,
        position: recruit.position,
        highSchool: recruit.school,
        city: recruit.city,
        state: recruit.stateProvince,
        country: recruit.country,
        height: recruit.height, // in inches
        weight: recruit.weight,
        stars: recruit.stars,
        rating: recruit.rating,
        ranking: recruit.ranking,
        recruitingClass: recruit.year,
        committedTo: recruit.committedTo,
        recruitType: recruit.recruitType
      }));

      res.json({ success: true, data: formattedRecruits });
    } catch (error) {
      console.error('Error searching HS recruits:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Search 247Sports for recruiting data (fallback when CFBD doesn't have data)
  async search247Recruiting(req, res) {
    try {
      const { name, school, originalSchool, year } = req.query;

      if (!name || !school) {
        return res.status(400).json({
          success: false,
          error: 'Name and school are required'
        });
      }

      console.log(`🏈 Searching 247Sports for: ${name} at ${school}${originalSchool ? ` (original: ${originalSchool})` : ''}`);

      // Schools to try - current school first, then original if different
      const schoolsToTry = [school];
      if (originalSchool && originalSchool.toLowerCase() !== school.toLowerCase()) {
        schoolsToTry.push(originalSchool);
      }

      // Determine years to search
      const currentYear = new Date().getFullYear();
      let yearsToTry = [];

      if (year) {
        yearsToTry = [parseInt(year)];
      } else {
        // Search backwards from current year (cover last 12 years for older players)
        for (let y = currentYear; y >= currentYear - 12; y--) {
          yearsToTry.push(y);
        }
      }

      let foundPlayer = null;
      let foundAtSchool = null;

      // Helper function to search a single year
      const searchYear = async (schoolSlug, year, schoolName) => {
        const url = `https://247sports.com/college/${schoolSlug}/Season/${year}-Football/Commits/`;
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 8000
          });

          const $ = cheerio.load(response.data);
          const commits = [];

          $('li.ri-page__list-item').each((i, el) => {
            const nameEl = $(el).find('a.ri-page__name-link');
            const commitName = nameEl.text().trim();

            if (commitName) {
              const ratingText = $(el).find('.score').text().trim();
              const rating = ratingText ? parseFloat(ratingText) / 100 : null;
              const natRank = $(el).find('.natrank').text().trim();
              const posRank = $(el).find('.posrank').text().trim();
              const stRank = $(el).find('.sttrank').text().trim();
              const starsEl = $(el).find('.ri-page__star-and-score .yellow, .icon-starsolid.yellow');
              const stars = starsEl.length || null;

              const metaText = $(el).find('.recruit .meta').text().trim();
              let highSchool = '', city = '', state = '';
              const cleanMeta = metaText.replace(/\s+/g, ' ').trim();
              const hometownMatch = cleanMeta.match(/^(.+?)\s*\((.+),\s*(\w+)\)/);
              if (hometownMatch) {
                highSchool = hometownMatch[1].trim();
                city = hometownMatch[2].trim();
                state = hometownMatch[3].trim();
              }

              const metricsText = $(el).find('.metrics').text().trim();
              let height = '', weight = '';
              const metricsMatch = metricsText.match(/(\d+-\d+)\s*\/\s*(\d+)/);
              if (metricsMatch) {
                height = metricsMatch[1].replace('-', "'") + '"';
                weight = metricsMatch[2];
              }

              commits.push({
                name: commitName,
                position: $(el).find('.position').text().trim(),
                rating, ranking: natRank && natRank !== 'NA' ? parseInt(natRank) : null,
                positionRanking: posRank ? parseInt(posRank) : null,
                stateRanking: stRank ? parseInt(stRank) : null,
                stars, highSchool, hometown: city, state, height, weight,
                classYear: year
              });
            }
          });

          // Search for player by name
          const nameLower = name.toLowerCase().trim();
          const nameParts = nameLower.split(' ');
          const matches = commits.filter(c => {
            const commitNameLower = c.name.toLowerCase();
            return nameParts.every(part => commitNameLower.includes(part));
          });

          if (matches.length > 0) {
            return { player: matches[0], school: schoolName, year };
          }
          return null;
        } catch (error) {
          return null;
        }
      };

      for (const searchSchool of schoolsToTry) {
        if (foundPlayer) break;

        const schoolSlug = searchSchool.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        console.log(`  Searching ${searchSchool} (parallel)...`);

        // Search years in parallel batches of 4
        const batchSize = 4;
        for (let i = 0; i < yearsToTry.length && !foundPlayer; i += batchSize) {
          const batch = yearsToTry.slice(i, i + batchSize);
          console.log(`    Batch: ${batch.join(', ')}`);

          const results = await Promise.all(
            batch.map(y => searchYear(schoolSlug, y, searchSchool))
          );

          const found = results.find(r => r !== null);
          if (found) {
            foundPlayer = found.player;
            foundAtSchool = found.school;
            console.log(`  ✅ Found ${name} in ${found.year} class at ${found.school}`);
            break;
          }
        }
      }

      if (foundPlayer) {
        res.json({
          success: true,
          source: '247sports',
          data: [{
            name: foundPlayer.name,
            position: foundPlayer.position,
            stars: foundPlayer.stars,
            rating: foundPlayer.rating,
            ranking: foundPlayer.ranking,
            stateRanking: foundPlayer.stateRanking,
            positionRanking: foundPlayer.positionRanking,
            highSchool: foundPlayer.highSchool,
            hometown: foundPlayer.hometown,
            state: foundPlayer.state,
            height: foundPlayer.height,
            weight: foundPlayer.weight,
            school: foundAtSchool,
            classYear: foundPlayer.classYear
          }]
        });
      } else {
        console.log(`  ❌ ${name} not found in 247Sports`);
        res.json({ success: true, source: '247sports', data: [] });
      }

    } catch (error) {
      console.error('Error searching 247Sports:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // =============================================
  // POSITION MANAGEMENT ENDPOINTS
  // =============================================

  // Get all unique positions with counts
  async getPositions(req, res) {
    try {
      const positions = await db.query(`
        SELECT position, COUNT(*) as count
        FROM players
        WHERE position IS NOT NULL AND position != ''
        GROUP BY position
        ORDER BY count DESC
      `);

      // Define standard positions
      const standardPositions = [
        'QB', 'RB', 'FB', 'WR', 'TE',
        'OL', 'OL (OT)', 'OL (OG)', 'OL (OC)',
        'IDL', 'EDGE', 'LB',
        'DB', 'DB (CB)', 'DB (SAF)',
        'SPEC', 'SPEC (K)', 'SPEC (P)'
      ];

      // Categorize positions
      const categorized = positions.map(p => ({
        position: p.position,
        count: p.count,
        isStandard: standardPositions.includes(p.position)
      }));

      res.json({
        success: true,
        data: {
          positions: categorized,
          standardPositions
        }
      });
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get players by specific position
  async getPlayersByPosition(req, res) {
    try {
      const { position } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const players = await db.query(`
        SELECT id, name, position, school, conference
        FROM players
        WHERE position = ?
        ORDER BY name
        LIMIT ? OFFSET ?
      `, [position, parseInt(limit), parseInt(offset)]);

      const countResult = await db.get(`
        SELECT COUNT(*) as total FROM players WHERE position = ?
      `, [position]);

      res.json({
        success: true,
        data: players,
        total: countResult.total
      });
    } catch (error) {
      console.error('Error fetching players by position:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Bulk update position for multiple players
  async bulkUpdatePosition(req, res) {
    try {
      const { playerIds, newPosition } = req.body;

      if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'playerIds array is required'
        });
      }

      if (!newPosition) {
        return res.status(400).json({
          success: false,
          error: 'newPosition is required'
        });
      }

      // Update all players
      const placeholders = playerIds.map(() => '?').join(',');
      await db.run(`
        UPDATE players
        SET position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
      `, [newPosition, ...playerIds]);

      res.json({
        success: true,
        message: `Updated ${playerIds.length} players to position: ${newPosition}`
      });
    } catch (error) {
      console.error('Error bulk updating positions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Map all players from one position to another
  async mapPosition(req, res) {
    try {
      const { fromPosition, toPosition } = req.body;

      if (!fromPosition || !toPosition) {
        return res.status(400).json({
          success: false,
          error: 'fromPosition and toPosition are required'
        });
      }

      const result = await db.run(`
        UPDATE players
        SET position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE position = ?
      `, [toPosition, fromPosition]);

      res.json({
        success: true,
        message: `Mapped all "${fromPosition}" to "${toPosition}"`,
        affectedRows: result.changes
      });
    } catch (error) {
      console.error('Error mapping position:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PlayersController();

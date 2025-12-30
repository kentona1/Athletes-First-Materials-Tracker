const db = require('../database/db');
const axios = require('axios');

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
        search 
      } = req.query;

      let sql = `
        SELECT 
          p.*,
          GROUP_CONCAT(DISTINCT a.name) as agents,
          COUNT(DISTINCT pm.id) as materials_count,
          po.status as outcome_status,
          po.draft_round
        FROM players p
        LEFT JOIN player_agents pa ON p.id = pa.player_id
        LEFT JOIN agents a ON pa.agent_id = a.id
        LEFT JOIN player_materials pm ON p.id = pm.player_id
        LEFT JOIN player_outcomes po ON p.id = po.player_id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        sql += ' AND p.status = ?';
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

      if (year) {
        sql += ' AND p.eligibility_year = ?';
        params.push(year);
      }

      if (search) {
        sql += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
      }

      sql += ' GROUP BY p.id ORDER BY p.name';

      const players = await db.query(sql, params);
      res.json({ success: true, data: players });
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

      res.json({
        success: true,
        data: {
          ...player,
          agents,
          materials,
          contacts,
          outcome
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

      const result = await db.run(`
        INSERT INTO players (
          name, position, school, conference, hometown, state,
          height, weight, class_year, eligibility_year, 
          photo_url, espn_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        playerData.name,
        playerData.position,
        playerData.school,
        playerData.conference,
        playerData.hometown,
        playerData.state,
        playerData.height,
        playerData.weight,
        playerData.class_year,
        playerData.eligibility_year,
        playerData.photo_url,
        playerData.espn_id,
        playerData.status || 'Active'
      ]);

      res.json({
        success: true,
        data: { id: result.id, ...playerData }
      });
    } catch (error) {
      console.error('Error creating player:', error);
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

      // Extract player results
      const players = searchResponse.data?.results || [];

      console.log('👥 Found', players.length, 'players');
      if (players.length > 0) {
        console.log('🏈 First player structure:', JSON.stringify(players[0], null, 2));
      }

      // Format results for frontend
      const formattedPlayers = players.map(player => {
        const formatted = {
          id: player.id,
          name: player.displayName || player.name || player.text,
          position: player.position?.abbreviation || player.position,
          school: player.team?.displayName || player.team?.name || player.team,
          league: player.league?.abbreviation || player.league,
          image: player.image?.url || player.imageUrl,
          url: player.url || player.link
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

  // Get detailed player data from ESPN by ID
  async getESPNPlayerDetails(req, res) {
    try {
      const { id } = req.params;

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

      const player = response.data?.athlete;

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }

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

      res.json({ success: true, data: formattedData });
    } catch (error) {
      console.error('Error fetching ESPN player details:', error.message);
      res.status(500).json({
        success: false,
        error: 'ESPN API error',
        message: error.message
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

  // Get analytics data
  async getAnalytics(req, res) {
    try {
      const { year } = req.query;

      // Overall stats
      const overallStats = await db.get(`
        SELECT 
          COUNT(*) as total_players,
          COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed,
          COUNT(CASE WHEN po.status = 'Missed' THEN 1 END) as missed,
          COUNT(CASE WHEN po.status = 'Walked Away' THEN 1 END) as walked_away,
          COUNT(CASE WHEN po.status = 'Returned to School' THEN 1 END) as returned,
          COUNT(CASE WHEN po.status = 'No Meeting' THEN 1 END) as no_meeting
        FROM players p
        LEFT JOIN player_outcomes po ON p.id = po.player_id
        ${year ? 'WHERE p.eligibility_year = ?' : ''}
      `, year ? [year] : []);

      // By position
      const byPosition = await db.query(`
        SELECT 
          p.position,
          COUNT(*) as count,
          COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed
        FROM players p
        LEFT JOIN player_outcomes po ON p.id = po.player_id
        ${year ? 'WHERE p.eligibility_year = ?' : ''}
        GROUP BY p.position
        ORDER BY count DESC
      `, year ? [year] : []);

      // By conference
      const byConference = await db.query(`
        SELECT 
          p.conference,
          COUNT(*) as count,
          COUNT(CASE WHEN po.status = 'Signed' THEN 1 END) as signed
        FROM players p
        LEFT JOIN player_outcomes po ON p.id = po.player_id
        ${year ? 'WHERE p.eligibility_year = ?' : ''}
        GROUP BY p.conference
        ORDER BY count DESC
      `, year ? [year] : []);

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
          materialsUsage
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PlayersController();

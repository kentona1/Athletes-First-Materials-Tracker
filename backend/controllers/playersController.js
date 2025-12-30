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

      // Get transfer history
      const transfers = await db.query(`
        SELECT * FROM player_transfers
        WHERE player_id = ?
        ORDER BY transfer_year DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          ...player,
          agents,
          materials,
          contacts,
          outcome,
          transfers
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
          photo_url, espn_id, status,
          high_school, recruiting_class_year, recruiting_stars,
          recruiting_rating, recruiting_ranking, recruiting_state_ranking,
          recruiting_position_ranking, original_commitment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        playerData.status || 'Active',
        playerData.high_school || null,
        playerData.recruiting_class_year || null,
        playerData.recruiting_stars || null,
        playerData.recruiting_rating || null,
        playerData.recruiting_ranking || null,
        playerData.recruiting_state_ranking || null,
        playerData.recruiting_position_ranking || null,
        playerData.original_commitment || null
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
      const { name, year, school } = req.query;

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

      console.log('🔄 Fetching transfer portal data for:', name, 'school:', school);

      // Try multiple years if year not specified
      const currentYear = new Date().getFullYear();
      const yearsToTry = year ? [parseInt(year)] : [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

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

      // Find matching player by EXACT name match
      const nameToMatch = name.toLowerCase().trim();
      const nameParts = nameToMatch.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];

      let matchingTransfers = allTransfers.filter(transfer => {
        const transferFullName = `${transfer.firstName} ${transfer.lastName}`.toLowerCase().trim();
        const transferFirstName = transfer.firstName?.toLowerCase().trim() || '';
        const transferLastName = transfer.lastName?.toLowerCase().trim() || '';

        // Require exact name match (not partial)
        const exactMatch = transferFullName === nameToMatch;
        const firstLastMatch = transferFirstName === firstName && transferLastName === lastName;

        return exactMatch || firstLastMatch;
      });

      console.log('📊 Found', matchingTransfers.length, 'exact name matches');

      // If we have a current school, FILTER to only transfers that lead to current school
      if (school && matchingTransfers.length > 0) {
        console.log('🏫 Filtering transfers for school:', school);

        // Only keep transfers where destination matches current school
        const filteredTransfers = matchingTransfers.filter(t => {
          const destSchool = t.destination?.toLowerCase() || '';
          const currentSchool = school.toLowerCase();
          const matches = destSchool.includes(currentSchool) || currentSchool.includes(destSchool);

          if (!matches) {
            console.log('  ❌ Filtering out:', `${t.origin} → ${t.destination} (${t.season}) - doesn't match ${school}`);
          } else {
            console.log('  ✅ Keeping:', `${t.origin} → ${t.destination} (${t.season})`);
          }

          return matches;
        });

        if (filteredTransfers.length === 0) {
          console.warn('⚠️ No transfers match current school. These may be for a different player with the same name.');
          console.warn('   Current school:', school);
          console.warn('   Transfer destinations:', matchingTransfers.map(t => t.destination).join(', '));

          // Return empty - don't show potentially wrong data
          return res.json({
            success: true,
            data: [],
            warning: 'Found transfers but none match current school - may be different player'
          });
        }

        // Use filtered transfers instead
        matchingTransfers = filteredTransfers;
        console.log('✅ Filtered to', matchingTransfers.length, 'transfers matching current school');
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
}

module.exports = new PlayersController();

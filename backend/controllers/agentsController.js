const db = require('../database/db');

class AgentsController {
  // Get all agents
  async getAllAgents(req, res) {
    try {
      const { includeInactive } = req.query;

      const agents = await db.query(`
        SELECT
          a.*,
          COUNT(DISTINCT pa.player_id) as player_count,
          COUNT(DISTINCT pm.id) as materials_count
        FROM agents a
        LEFT JOIN player_agents pa ON a.id = pa.agent_id
        LEFT JOIN player_materials pm ON a.id = pm.agent_id
        ${includeInactive === 'true' ? '' : 'WHERE a.active = 1'}
        GROUP BY a.id
        ORDER BY a.name
      `);

      res.json({ success: true, data: agents });
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get single agent with details
  async getAgent(req, res) {
    try {
      const { id } = req.params;

      const agent = await db.get(
        'SELECT * FROM agents WHERE id = ?',
        [id]
      );

      if (!agent) {
        return res.status(404).json({ 
          success: false, 
          error: 'Agent not found' 
        });
      }

      // Get agent's players
      const players = await db.query(`
        SELECT 
          p.*,
          po.status as outcome_status,
          po.draft_round
        FROM players p
        JOIN player_agents pa ON p.id = pa.player_id
        LEFT JOIN player_outcomes po ON p.id = po.player_id
        WHERE pa.agent_id = ?
        ORDER BY p.name
      `, [id]);

      // Get performance stats
      const stats = await db.get(`
        SELECT 
          COUNT(DISTINCT pa.player_id) as total_players,
          COUNT(DISTINCT CASE WHEN po.status = 'Signed' THEN pa.player_id END) as signed,
          COUNT(DISTINCT CASE WHEN po.status = 'Missed' THEN pa.player_id END) as missed,
          COUNT(DISTINCT pm.id) as total_materials
        FROM player_agents pa
        LEFT JOIN player_outcomes po ON pa.player_id = po.player_id
        LEFT JOIN player_materials pm ON pa.player_id = pm.player_id AND pa.agent_id = pm.agent_id
        WHERE pa.agent_id = ?
      `, [id]);

      res.json({
        success: true,
        data: {
          ...agent,
          players,
          stats
        }
      });
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create new agent
  async createAgent(req, res) {
    try {
      const { first_name, last_name, email, phone, name: providedName } = req.body;

      // Support both name field or first_name/last_name
      const fullName = providedName || `${first_name || ''} ${last_name || ''}`.trim();

      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: 'Agent name is required (provide name or first_name/last_name)'
        });
      }

      const result = await db.run(`
        INSERT INTO agents (name, first_name, last_name, email, phone)
        VALUES (?, ?, ?, ?, ?)
      `, [fullName, first_name || null, last_name || null, email || null, phone || null]);

      res.json({
        success: true,
        data: { id: result.id, name: fullName, first_name, last_name, email, phone }
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update agent
  async updateAgent(req, res) {
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

      values.push(id);

      await db.run(
        `UPDATE agents SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ success: true, message: 'Agent updated' });
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get agent performance report
  async getAgentPerformance(req, res) {
    try {
      const { year } = req.query;

      let sql = `
        SELECT 
          a.name as agent,
          COUNT(DISTINCT pa.player_id) as total_players,
          COUNT(DISTINCT CASE WHEN po.status = 'Signed' THEN pa.player_id END) as signed,
          COUNT(DISTINCT CASE WHEN po.status = 'Missed' THEN pa.player_id END) as missed,
          COUNT(DISTINCT CASE WHEN po.status = 'Walked Away' THEN pa.player_id END) as walked_away,
          COUNT(DISTINCT CASE WHEN po.status = 'Returned to School' THEN pa.player_id END) as returned,
          COUNT(DISTINCT CASE WHEN po.status = 'No Meeting' THEN pa.player_id END) as no_meeting,
          COUNT(DISTINCT pm.id) as total_materials,
          ROUND(
            CAST(COUNT(DISTINCT CASE WHEN po.status = 'Signed' THEN pa.player_id END) AS FLOAT) / 
            NULLIF(COUNT(DISTINCT pa.player_id), 0) * 100, 2
          ) as conversion_rate
        FROM agents a
        LEFT JOIN player_agents pa ON a.id = pa.agent_id
        LEFT JOIN players p ON pa.player_id = p.id
        LEFT JOIN player_outcomes po ON pa.player_id = po.player_id
        LEFT JOIN player_materials pm ON pa.player_id = pm.player_id AND pa.agent_id = pm.agent_id
        WHERE a.active = 1
      `;

      const params = [];

      if (year) {
        sql += ' AND p.eligibility_year = ?';
        params.push(year);
      }

      sql += ' GROUP BY a.id ORDER BY signed DESC';

      const performance = await db.query(sql, params);

      res.json({ success: true, data: performance });
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new AgentsController();

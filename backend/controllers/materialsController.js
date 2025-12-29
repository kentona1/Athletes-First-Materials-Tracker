const db = require('../database/db');

class MaterialsController {
  // Get all material types
  async getMaterialTypes(req, res) {
    try {
      const types = await db.query(`
        SELECT * FROM material_types 
        ORDER BY category, name
      `);

      res.json({ success: true, data: types });
    } catch (error) {
      console.error('Error fetching material types:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Add material type
  async addMaterialType(req, res) {
    try {
      const { name, category, description } = req.body;

      const result = await db.run(`
        INSERT INTO material_types (name, category, description)
        VALUES (?, ?, ?)
      `, [name, category, description]);

      res.json({
        success: true,
        data: { id: result.id, name, category, description }
      });
    } catch (error) {
      console.error('Error adding material type:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Log material for player
  async logMaterial(req, res) {
    try {
      const {
        playerId,
        materialTypeId,
        agentId,
        title,
        description,
        deliveryMethod,
        deliveryDate,
        filePath,
        fileUrl,
        notes
      } = req.body;

      const result = await db.run(`
        INSERT INTO player_materials (
          player_id, material_type_id, agent_id, title, description,
          delivery_method, delivery_date, file_path, file_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        playerId,
        materialTypeId,
        agentId,
        title,
        description,
        deliveryMethod,
        deliveryDate,
        filePath,
        fileUrl,
        notes
      ]);

      res.json({
        success: true,
        data: { id: result.id, ...req.body }
      });
    } catch (error) {
      console.error('Error logging material:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get materials for a player
  async getPlayerMaterials(req, res) {
    try {
      const { playerId } = req.params;

      const materials = await db.query(`
        SELECT 
          pm.*,
          mt.name as type_name,
          mt.category,
          a.name as agent_name
        FROM player_materials pm
        JOIN material_types mt ON pm.material_type_id = mt.id
        LEFT JOIN agents a ON pm.agent_id = a.id
        WHERE pm.player_id = ?
        ORDER BY pm.delivery_date DESC
      `, [playerId]);

      res.json({ success: true, data: materials });
    } catch (error) {
      console.error('Error fetching player materials:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update material
  async updateMaterial(req, res) {
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
        `UPDATE player_materials SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ success: true, message: 'Material updated' });
    } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Delete material
  async deleteMaterial(req, res) {
    try {
      const { id } = req.params;

      await db.run('DELETE FROM player_materials WHERE id = ?', [id]);

      res.json({ success: true, message: 'Material deleted' });
    } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Log contact/meeting
  async logContact(req, res) {
    try {
      const {
        playerId,
        agentId,
        contactType,
        contactDate,
        location,
        notes,
        materialsPresented
      } = req.body;

      const result = await db.run(`
        INSERT INTO player_contacts (
          player_id, agent_id, contact_type, contact_date,
          location, notes, materials_presented
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        playerId,
        agentId,
        contactType,
        contactDate,
        location,
        notes,
        JSON.stringify(materialsPresented || [])
      ]);

      res.json({
        success: true,
        data: { id: result.id, ...req.body }
      });
    } catch (error) {
      console.error('Error logging contact:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get materials summary/analytics
  async getMaterialsSummary(req, res) {
    try {
      const { year, agent } = req.query;

      let sql = `
        SELECT 
          mt.name as material_type,
          mt.category,
          COUNT(pm.id) as usage_count,
          COUNT(DISTINCT pm.player_id) as unique_players,
          COUNT(DISTINCT CASE WHEN po.status = 'Signed' THEN pm.player_id END) as signed_players
        FROM material_types mt
        LEFT JOIN player_materials pm ON mt.id = pm.material_type_id
        LEFT JOIN players p ON pm.player_id = p.id
        LEFT JOIN player_outcomes po ON p.id = po.player_id
        WHERE 1=1
      `;

      const params = [];

      if (year) {
        sql += ' AND p.eligibility_year = ?';
        params.push(year);
      }

      if (agent) {
        sql += ' AND pm.agent_id = ?';
        params.push(agent);
      }

      sql += ' GROUP BY mt.id ORDER BY usage_count DESC';

      const summary = await db.query(sql, params);

      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error fetching materials summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Batch log materials for a meeting
  async batchLogMaterials(req, res) {
    try {
      const { playerId, agentId, deliveryDate, deliveryMethod, materials } = req.body;

      const results = [];

      for (const material of materials) {
        const result = await db.run(`
          INSERT INTO player_materials (
            player_id, material_type_id, agent_id, title,
            delivery_method, delivery_date, file_path, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          playerId,
          material.materialTypeId,
          agentId,
          material.title,
          deliveryMethod,
          deliveryDate,
          material.filePath,
          material.notes
        ]);

        results.push({ id: result.id, ...material });
      }

      res.json({
        success: true,
        data: results,
        message: `${results.length} materials logged`
      });
    } catch (error) {
      console.error('Error batch logging materials:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new MaterialsController();

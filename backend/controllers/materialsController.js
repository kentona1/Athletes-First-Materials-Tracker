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

  // ========================================
  // EVENT-BASED LOGGING (New Workflow)
  // ========================================

  // Create material event with multiple materials
  async createMaterialEvent(req, res) {
    try {
      const { playerId, eventDate, deliveryMethod, materialIds, copies, notes } = req.body;

      // Validate required fields
      if (!playerId || !eventDate || !deliveryMethod || !materialIds || materialIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: playerId, eventDate, deliveryMethod, materialIds'
        });
      }

      // Get current event count for this delivery method
      const countResult = await db.get(`
        SELECT COUNT(*) as count
        FROM material_events
        WHERE player_id = ? AND delivery_method = ?
      `, [playerId, deliveryMethod]);

      const eventNumber = (countResult?.count || 0) + 1;

      // Default copies to 1 if not provided (for Email) or use provided value
      const copiesCount = copies || 1;

      // Create the event
      const eventResult = await db.run(`
        INSERT INTO material_events (player_id, event_date, delivery_method, event_number, copies, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [playerId, eventDate, deliveryMethod, eventNumber, copiesCount, notes || null]);

      const eventId = eventResult.id;

      // Link materials to the event
      const materialResults = [];
      for (const materialTypeId of materialIds) {
        const materialResult = await db.run(`
          INSERT INTO player_materials (
            player_id, material_type_id, event_id, delivery_date, delivery_method
          ) VALUES (?, ?, ?, ?, ?)
        `, [playerId, materialTypeId, eventId, eventDate, deliveryMethod]);

        materialResults.push({ id: materialResult.id, materialTypeId });
      }

      console.log(`✅ Created event: ${deliveryMethod} -x${eventNumber} with ${materialResults.length} materials`);

      res.json({
        success: true,
        data: {
          eventId,
          eventNumber,
          eventLabel: `${deliveryMethod} -x${eventNumber}`,
          materialsCount: materialResults.length
        },
        message: `Event created: ${deliveryMethod} -x${eventNumber}`
      });
    } catch (error) {
      console.error('Error creating material event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all events for a player (with materials grouped)
  async getPlayerEvents(req, res) {
    try {
      const { playerId } = req.params;

      // Get all events
      const events = await db.query(`
        SELECT * FROM material_events_view
        WHERE player_id = ?
        ORDER BY event_date DESC
      `, [playerId]);

      // For each event, get the detailed materials list
      for (const event of events) {
        const materials = await db.query(`
          SELECT
            pm.id,
            pm.material_type_id,
            mt.name as material_name,
            mt.category
          FROM player_materials pm
          JOIN material_types mt ON pm.material_type_id = mt.id
          WHERE pm.event_id = ?
        `, [event.id]);

        event.materials_detailed = materials;
      }

      res.json({ success: true, data: events });
    } catch (error) {
      console.error('Error fetching player events:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update material event
  async updateMaterialEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { eventDate, deliveryMethod, materialIds, copies, notes } = req.body;

      // Update event details
      const updateFields = [];
      const updateValues = [];

      if (eventDate) {
        updateFields.push('event_date = ?');
        updateValues.push(eventDate);
      }
      if (deliveryMethod) {
        updateFields.push('delivery_method = ?');
        updateValues.push(deliveryMethod);
      }
      if (copies !== undefined) {
        updateFields.push('copies = ?');
        updateValues.push(copies);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }

      if (updateFields.length > 0) {
        updateValues.push(eventId);
        await db.run(
          `UPDATE material_events SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update materials if provided
      if (materialIds && materialIds.length > 0) {
        // Delete existing materials for this event
        await db.run('DELETE FROM player_materials WHERE event_id = ?', [eventId]);

        // Get event details for player_id and delivery info
        const event = await db.get('SELECT * FROM material_events WHERE id = ?', [eventId]);

        // Insert new materials
        for (const materialTypeId of materialIds) {
          await db.run(`
            INSERT INTO player_materials (
              player_id, material_type_id, event_id, delivery_date, delivery_method
            ) VALUES (?, ?, ?, ?, ?)
          `, [event.player_id, materialTypeId, eventId, event.event_date, event.delivery_method]);
        }
      }

      res.json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
      console.error('Error updating material event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Delete material event and all associated materials
  async deleteMaterialEvent(req, res) {
    try {
      const { eventId } = req.params;

      // Delete materials first (will cascade if FK is set, but being explicit)
      await db.run('DELETE FROM player_materials WHERE event_id = ?', [eventId]);

      // Delete event
      await db.run('DELETE FROM material_events WHERE id = ?', [eventId]);

      res.json({ success: true, message: 'Event and materials deleted successfully' });
    } catch (error) {
      console.error('Error deleting material event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new MaterialsController();

# Athletes First Recruiting Materials Tracker

A comprehensive web application for tracking recruiting materials, player interactions, and outcomes for Athletes First agency.

## Features

### Core Functionality
- **Player Management**: Add, edit, and track players through recruiting process
- **Materials Tracking**: Log all materials sent to prospects with dates, delivery methods, and file links
- **Agent Performance**: Track which agents are working with which players
- **Outcome Tracking**: Monitor signing outcomes, draft positions, and conversion rates
- **Analytics Dashboard**: Visualize recruiting data by position, conference, materials used, and more
- **Search & Filter**: Easily find players by name, status, position, school, conference, or agent

### Key Benefits vs. Current System
✅ **No More Manual Entry**: Dropdowns and autofill instead of typing everything
✅ **Automatic Tracking**: Materials logged in real-time, no backtracking needed
✅ **Linked Files**: Direct links to OneDrive/Synology files from player records
✅ **Instant Analytics**: Generate reports and identify patterns with one click
✅ **Centralized Data**: Everything in one place instead of Trello + Sheets + Multiple drives
✅ **ESPN Integration**: Auto-populate player data from ESPN API
✅ **Pattern Recognition**: See which materials lead to signings

## Technology Stack

**Backend:**
- Node.js + Express
- SQLite database (easily upgradeable to PostgreSQL)
- RESTful API architecture

**Frontend:**
- React 18
- React Router for navigation
- Recharts for data visualization
- Axios for API calls

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd athletes-first-tracker/backend
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run init-db
```

4. Start the backend server:
```bash
npm start
```

The API will be running on `http://localhost:3001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd athletes-first-tracker/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Usage Guide

### Adding a New Player

1. Click "Players" in navigation
2. Click "+ Add New Player"
3. Fill in player information (name, position, school, etc.)
4. Click "Add Player"

### Logging Materials

1. Navigate to a player's detail page
2. Click "+ Log Material"
3. Select material type, agent, delivery method, and date
4. Add file path/link to OneDrive or Synology
5. Click "Save Material"

**Batch Logging**: You can log multiple materials from the same meeting at once

### Tracking Outcomes

From the player detail page, update the player status to:
- Signed
- Missed
- Walked Away
- Returned to School
- No Meeting

### Viewing Analytics

1. Click "Analytics" in navigation
2. Filter by year if needed
3. View charts for:
   - Outcome distribution
   - Players by position
   - Players by conference
   - Most-used materials

### Searching & Filtering

On the Players page, use the filter bar to:
- Search by player name
- Filter by status (Active, Signed, Missed, etc.)
- Filter by position
- Filter by conference
- Filter by assigned agent

## API Endpoints

### Players
- `GET /api/players` - Get all players (with optional filters)
- `GET /api/players/:id` - Get single player with full details
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/players/analytics` - Get analytics data
- `GET /api/players/search-espn?name=` - Search ESPN for player data

### Materials
- `GET /api/materials/types` - Get all material types
- `POST /api/materials` - Log new material
- `POST /api/materials/batch` - Batch log multiple materials
- `GET /api/materials/player/:playerId` - Get player's materials
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material
- `GET /api/materials/summary` - Get materials analytics

### Agents
- `GET /api/agents` - Get all agents
- `GET /api/agents/:id` - Get agent with details
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `GET /api/agents/performance` - Get agent performance metrics

## Database Schema

### Main Tables
- **players** - Player information and status
- **agents** - Agent profiles
- **player_agents** - Many-to-many relationship
- **material_types** - Standardized material categories
- **player_materials** - Materials sent to players
- **player_contacts** - Meeting/contact log
- **player_outcomes** - Final outcomes and draft info

## Data Migration

To import your existing Excel data:

1. The database comes pre-populated with:
   - All agent names from your current system
   - Common material types
   - Recruiting cycles (2019-2025)

2. To import historical player data, you can:
   - Manually add players through the UI
   - Use the API to bulk import
   - Create a custom import script (I can help with this)

## File Organization

Your current workflow:
```
Trello → Synology → OneDrive → Google Sheets
```

Recommended new workflow:
```
App → Synology (working files) → OneDrive (finals with auto-links in app)
```

### File Linking
When logging materials, enter the OneDrive or Synology path:
- OneDrive: `https://athletesfirst.sharepoint.com/...`
- Synology: `\\synology\recruiting\2025\player-name\...`

These links will be clickable from player detail pages.

## Customization

### Adding Material Types
Navigate to Materials page → Add Material Type

### Adding Agents
Navigate to Agents page → Add Agent

### Modifying Status Options
Edit `backend/database/schema.sql` and adjust the status enums

## Deployment

### Local Network Deployment
1. Change backend port in `backend/server.js` if needed
2. Update frontend proxy in `frontend/package.json`
3. Build frontend: `npm run build`
4. Serve static files from backend

### Cloud Deployment Options
- **Heroku**: Easy deployment, free tier available
- **AWS**: More control, scalable
- **DigitalOcean**: Simple VPS hosting
- **Render**: Modern alternative to Heroku

## Future Enhancements

Potential additions based on your needs:
- [ ] Mobile app (React Native)
- [ ] Email notifications for upcoming follow-ups
- [ ] Automated report generation (PDF exports)
- [ ] Integration with Trello for project management
- [ ] Calendar integration for scheduled contacts
- [ ] Advanced analytics (prediction models)
- [ ] Document generation from templates
- [ ] More detailed ESPN API integration
- [ ] File upload directly to OneDrive from app
- [ ] Real-time collaboration features

## Troubleshooting

### Backend won't start
- Check if port 3001 is available
- Ensure database was initialized: `npm run init-db`
- Check console for error messages

### Frontend won't connect to backend
- Verify backend is running on port 3001
- Check proxy setting in `frontend/package.json`
- Clear browser cache and restart

### Database issues
- Delete `recruiting_tracker.db` file
- Run `npm run init-db` again
- Check file permissions

## Support

For questions or issues:
1. Check the console logs (both frontend and backend)
2. Verify all dependencies are installed
3. Ensure both servers are running
4. Check that ports 3000 and 3001 are available

## License

Proprietary - Athletes First

---

Built with ❤️ for Athletes First recruiting team

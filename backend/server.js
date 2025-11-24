const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection - Render provides DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database table
async function initializeDatabase() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sightings (
        id SERIAL PRIMARY KEY,
        animal VARCHAR(100) NOT NULL,
        date_time TIMESTAMP NOT NULL,
        location TEXT NOT NULL,
        notes TEXT,
        photo_url TEXT,
        audio_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('Database table initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Routes
app.post('/api/sightings', async (req, res) => {
  try {
    const { animal, dateTime, location, notes } = req.body;
    
    const query = `
      INSERT INTO sightings (animal, date_time, location, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    
    const values = [animal, new Date(), location, notes || ''];
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Sighting reported successfully'
    });
  } catch (error) {
    console.error('Error submitting sighting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit sighting'
    });
  }
});

app.get('/api/sightings', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        animal,
        TO_CHAR(date_time, 'Month DD, YYYY, HH12:MI AM') as date_time,
        location,
        notes,
        photo_url,
        audio_url,
        created_at
      FROM sightings 
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching sightings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sightings'
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      success: true, 
      message: 'API is running and database is connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Wildlife Sighting API running on port ${port}`);
  await initializeDatabase();
});
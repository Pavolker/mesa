
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load env vars
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env.local') });

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Pool
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

// Init DB
const initDb = async () => {
    try {
        const client = await pool.connect();
        await client.query(`
      CREATE TABLE IF NOT EXISTS writings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT,
        content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        client.release();
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();

// Routes
app.post('/api/save', async (req, res) => {
    const { title, content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO writings (title, content) VALUES ($1, $2) RETURNING *',
            [title || 'Untitled', content]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving writing:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

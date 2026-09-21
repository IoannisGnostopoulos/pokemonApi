const { Pool } = require('pg');
require('dotenv').config();

// Ρύθμιση σύνδεσης με την PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

async function initDatabase() {
    try {
        // 1. Πίνακας Χρηστών (Το AUTOINCREMENT στην PostgreSQL είναι SERIAL)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        `);

        // 2. Πίνακας Pokémon
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pokemon (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                image TEXT NOT NULL
            )
        `);

        // 3. Πίνακας Συλλογής (Junction Table)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_pokemon (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                pokemon_id INTEGER REFERENCES pokemon(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, pokemon_id)
            )
        `);

        console.log('✅ Οι πίνακες στην PostgreSQL είναι έτοιμοι!');
    } catch (err) {
        console.error('❌ Σφάλμα κατά τη δημιουργία των πινάκων:', err);
    }
}

module.exports = { pool, initDatabase };
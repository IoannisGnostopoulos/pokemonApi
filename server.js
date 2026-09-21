const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware για έλεγχο ταυτοποίησης (JWT Auth Middleware)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(0o1).json({ error: 'Δεν δόθηκε token πρόσβασης' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Μη έγκυρο token' });
        req.user = user;
        next();
    });
}

// ==========================================
// 1. ENDPOINTS ΧΡΗΣΤΩΝ (REGISTER & LOGIN)
// ==========================================

// Εγγραφή νέου χρήστη
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Παρακαλώ συμπληρώστε όλα τα πεδία' });
    }

    try {
        // Κρυπτογράφηση κωδικού
        const hashedPassword = await bcrypt.hash(password, 10);

        // Εισαγωγή στη βάση
        const newUser = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );

        res.status(201).json({
            message: 'Ο χρήστης δημιουργήθηκε επιτυχώς!',
            user: newUser.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') { // Κωδικός σφάλματος PostgreSQL για duplicate username
            return res.status(400).json({ error: 'Το όνομα χρήστη υπάρχει ήδη' });
        }
        res.status(500).json({ error: 'Σφάλμα διακομιστή' });
    }
});

// Σύνδεση χρήστη
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Λανθασμένο username ή password' });
        }

        const user = result.rows[0];

        // Έλεγχος κωδικού
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Λανθασμένο username ή password' });
        }

        // Δημιουργία JWT Token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Επιτυχής σύνδεση!',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (err) {
        res.status(500).json({ error: 'Σφάλμα διακομιστή' });
    }
});

// ==========================================
// 2. ENDPOINTS POKEMON & ΣΥΛΛΟΓΗΣ
// ==========================================

// Επιστρέφει και τα 100 Pokémon
app.get('/api/pokemon', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pokemon ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Σφάλμα κατά τη λήψη των Pokémon' });
    }
});

// Επιστρέφει τη συλλογή του συνδεδεμένου χρήστη
app.get('/api/my-collection', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.id, p.name, p.image 
             FROM pokemon p 
             JOIN user_pokemon up ON p.id = up.pokemon_id 
             WHERE up.user_id = $1 ORDER BY p.id ASC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Σφάλμα κατά τη λήψη της συλλογής' });
    }
});

// Προσθήκη κάρτας στη συλλογή
app.post('/api/collection/add', authenticateToken, async (req, res) => {
    const { pokemon_id } = req.body;

    try {
        await pool.query(
            'INSERT INTO user_pokemon (user_id, pokemon_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, pokemon_id]
        );
        res.json({ message: 'Το Pokémon προστέθηκε στη συλλογή σου!' });
    } catch (err) {
        res.status(500).json({ error: 'Σφάλμα κατά την προσθήκη' });
    }
});

// Αφαίρεση κάρτας από τη συλλογή
app.delete('/api/collection/remove/:id', authenticateToken, async (req, res) => {
    const pokemon_id = req.params.id;

    try {
        await pool.query(
            'DELETE FROM user_pokemon WHERE user_id = $1 AND pokemon_id = $2',
            [req.user.id, pokemon_id]
        );
        res.json({ message: 'Το Pokémon αφαιρέθηκε από τη συλλογή σου' });
    } catch (err) {
        res.status(500).json({ error: 'Σφάλμα κατά την αφαίρεση' });
    }
});

// Εκκίνηση του Server
app.listen(PORT, () => {
    console.log(`🚀 Ο server τρέχει στο http://localhost:${PORT}`);
});
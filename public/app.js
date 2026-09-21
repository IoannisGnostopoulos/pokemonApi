const API_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// Αρχικός έλεγχος σύνδεσης
document.addEventListener('DOMContentLoaded', () => {
    if (token && currentUser) {
        showApp();
    } else {
        showAuth();
    }
});

// LOGIN
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        showApp();
    } else {
        alert(data.error);
    }
});

// REGISTER
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        alert('Η εγγραφή ολοκληρώθηκε! Τώρα κάνε σύνδεση.');
    } else {
        alert(data.error);
    }
});

// LOGOUT
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    showAuth();
}

function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('collection-section').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('collection-section').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('username-display').innerText = currentUser.username;
    loadPokemonCards();
}

// Φόρτωση Καρτών (Όλα τα 100 Pokémon + Συλλογή Χρήστη)
async function loadPokemonCards() {
    try {
        // 1. Παίρνουμε όλα τα 100 Pokémon
        const resAll = await fetch(`${API_URL}/pokemon`);
        const allPokemon = await resAll.json();

        // 2. Παίρνουμε τη συλλογή του συγκεκριμένου χρήστη
        const resOwned = await fetch(`${API_URL}/my-collection`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ownedPokemon = await resOwned.json();
        
        const ownedIds = new Set(ownedPokemon.map(p => p.id));
        document.getElementById('owned-count').innerText = ownedIds.size;

        // 3. Εμφάνιση των καρτών στο Grid
        const grid = document.getElementById('pokemon-grid');
        grid.innerHTML = '';

        allPokemon.forEach(pokemon => {
            const isOwned = ownedIds.has(pokemon.id);

            const card = document.createElement('div');
            card.className = `card ${isOwned ? 'owned' : 'not-owned'}`;
            card.innerHTML = `
                <img src="${pokemon.image}" alt="${pokemon.name}">
                <h3>#${pokemon.id} ${pokemon.name}</h3>
                <button onclick="togglePokemon(${pokemon.id}, ${isOwned})">
                    ${isOwned ? '✔ Στη Συλλογή (Αφαίρεση)' : '➕ Προσθήκη'}
                </button>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Σφάλμα κατά τη φόρτωση:', err);
    }
}

// Προσθήκη ή Αφαίρεση Pokémon από τη συλλογή
async function togglePokemon(pokemonId, isOwned) {
    const endpoint = isOwned ? `/collection/remove/${pokemonId}` : '/collection/add';
    const method = isOwned ? 'DELETE' : 'POST';

    await fetch(`${API_URL}${endpoint}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: !isOwned ? JSON.stringify({ pokemon_id: pokemonId }) : null
    });

    // Επαναφόρτωση καρτών
    loadPokemonCards();
}

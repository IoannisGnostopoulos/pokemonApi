const { pool, initDatabase } = require('./database');

async function seedPokemon() {
    // 1. Φτιάχνουμε τους πίνακες (αν δεν υπάρχουν)
     await initDatabase();

    console.log('⏳ Λήψη 100 Pokémon από το PokéAPI...');

    for (let i = 1; i <= 100; i++) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
            const data = await response.json();

            const id = data.id;
            const name = data.name;
            const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;

            // Εισαγωγή στη βάση. Το $1, $2, $3 είναι ο τρόπος της PostgreSQL για παραμέτρους
            await pool.query(
                `INSERT INTO pokemon (id, name, image) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (id) DO NOTHING`, // Αποτροπή διπλότυπων
                [id, name, image]
            );

            console.log(`[${i}/100] Αποθηκεύτηκε: ${name}`);
        } catch (err) {
            console.error(`❌ Σφάλμα στο Pokémon με id ${i}:`, err);
        }
    }

    console.log('🎉 Η PostgreSQL ενημερώθηκε επιτυχώς με 100 Pokémon!');
    process.exit(0); // Κλείνουμε το script
}

seedPokemon();


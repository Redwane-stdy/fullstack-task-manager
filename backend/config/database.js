/*database.js*/
const { Pool } = require('pg');

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taskmanager',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password123',
    
    // Configuration du pool de connexions
    max: 20, // nombre maximum de clients dans le pool
    idleTimeoutMillis: 30000, // fermeture des connexions inactives après 30s
    connectionTimeoutMillis: 2000, // temps d'attente pour obtenir une connexion
    
    // Configuration SSL pour la production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Création du pool de connexions
const pool = new Pool(dbConfig);

// Gestion des événements du pool
pool.on('connect', (client) => {
    console.log('🔌 Nouvelle connexion à la base de données établie');
});

pool.on('error', (err, client) => {
    console.error('❌ Erreur inattendue sur le client de base de données:', err);
});

pool.on('acquire', (client) => {
    console.log('📦 Client de base de données acquis depuis le pool');
});

pool.on('remove', (client) => {
    console.log('🗑️ Client de base de données retiré du pool');
});

/**
 * Teste la connexion à la base de données
 */
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        console.log('📊 Connexion à la base de données réussie:', {
            time: result.rows[0].current_time,
            version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
        });
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données:', error.message);
        throw error;
    }
};

/**
 * Exécute une requête avec gestion d'erreur
 */
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log des requêtes lentes (plus de 100ms)
        if (duration > 100) {
            console.warn(`⚠️ Requête lente (${duration}ms):`, {
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration
            });
        }
        
        return result;
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la requête:', {
            error: error.message,
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params
        });
        throw error;
    }
};

/**
 * Exécute une requête dans une transaction
 */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Ferme le pool de connexions
 */
const closePool = async () => {
    try {
        await pool.end();
        console.log('🔒 Pool de connexions fermé');
    } catch (error) {
        console.error('❌ Erreur lors de la fermeture du pool:', error);
    }
};

/**
 * Obtient les statistiques du pool
 */
const getPoolStats = () => {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    };
};

module.exports = {
    pool,
    query,
    testConnection,
    withTransaction,
    closePool,
    getPoolStats
};
/* server.js */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const boardsRoutes = require('./routes/boards');
const listsRoutes = require('./routes/lists');
const cardsRoutes = require('./routes/cards');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de sécurité
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par windowMs
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    }
});
app.use('/api/', limiter);

// Rate limiting plus strict pour l'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limite chaque IP à 5 tentatives de connexion par windowMs
    message: {
        error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
    }
});

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://votre-frontend-domain.com'] 
        : ['http://localhost:5173', 'http://frontend:5173'],
    credentials: true
}));

// Middleware de compression
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/users', userRoutes);

// Route de santé
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Task Manager API',
        version: '1.0.0'
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'Task Manager API',
        version: '1.0.0',
        status: 'Running',
        documentation: '/api/docs'
    });
});

// Middleware de gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.originalUrl,
        method: req.method
    });
});

// Middleware global de gestion des erreurs
app.use((error, req, res, next) => {
    console.error('Error:', error);

    // Erreur de validation Joi
    if (error.isJoi) {
        return res.status(400).json({
            error: 'Données invalides',
            details: error.details.map(detail => detail.message)
        });
    }

    // Erreur JWT
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token invalide'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expiré'
        });
    }

    // Erreur de base de données
    if (error.code) {
        switch (error.code) {
            case '23505': // Violation de contrainte unique
                return res.status(409).json({
                    error: 'Cette ressource existe déjà'
                });
            case '23503': // Violation de clé étrangère
                return res.status(400).json({
                    error: 'Référence invalide'
                });
            case '23502': // Violation NOT NULL
                return res.status(400).json({
                    error: 'Champ requis manquant'
                });
        }
    }

    // Erreur générique
    res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erreur interne du serveur' 
            : error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
});

// Démarrage du serveur
const startServer = async () => {
    try {
        // Test de connexion à la base de données
        await testConnection();
        console.log('✅ Connexion à la base de données établie');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`📱 Mode: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`💊 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
};

// Gestion des signaux de fermeture
process.on('SIGTERM', () => {
    console.log('📝 Signal SIGTERM reçu, fermeture du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📝 Signal SIGINT reçu, fermeture du serveur...');
    process.exit(0);
});

startServer();
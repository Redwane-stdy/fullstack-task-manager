-- Initialisation de la base de données Task Manager
-- Fichier: backend/database/init.sql

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des boards (tableaux)
CREATE TABLE boards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    background_color VARCHAR(7) DEFAULT '#0079bf',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des listes
CREATE TABLE lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des cartes/tâches
CREATE TABLE cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    assigned_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des labels
CREATE TABLE labels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison cartes-labels
CREATE TABLE card_labels (
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
);

-- Table des commentaires
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimisation des performances
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_lists_board_id ON lists(board_id);
CREATE INDEX idx_cards_list_id ON cards(list_id);
CREATE INDEX idx_cards_assigned_user ON cards(assigned_user_id);
CREATE INDEX idx_comments_card_id ON comments(card_id);
CREATE INDEX idx_card_labels_card_id ON card_labels(card_id);

-- Trigger pour mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de test
INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
('admin', 'admin@taskmanager.com', '$2b$10$rHzONSj6kLUvpzqLqLr0/eQwG7OfQe8yQ1l0mF1eX8c8a8sG6YcQq', 'Admin', 'User'),
('john_doe', 'john@example.com', '$2b$10$rHzONSj6kLUvpzqLqLr0/eQwG7OfQe8yQ1l0mF1eX8c8a8sG6YcQq', 'John', 'Doe');

-- Board de test
INSERT INTO boards (title, description, user_id) VALUES
('Projet Personnel', 'Mon premier tableau de tâches', (SELECT id FROM users WHERE username = 'admin'));

-- Listes de test
INSERT INTO lists (title, position, board_id) VALUES
('À faire', 0, (SELECT id FROM boards WHERE title = 'Projet Personnel')),
('En cours', 1, (SELECT id FROM boards WHERE title = 'Projet Personnel')),
('Terminé', 2, (SELECT id FROM boards WHERE title = 'Projet Personnel'));


-- Boards by user
CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(user_id);

-- Lists by board, and speed ordering by position
CREATE INDEX IF NOT EXISTS idx_lists_board_pos ON lists(board_id, position);

-- Cards by list, and speed ordering by position
CREATE INDEX IF NOT EXISTS idx_cards_list_pos ON cards(list_id, position);

-- If you filter/search cards by title
CREATE INDEX IF NOT EXISTS idx_cards_title_trgm ON cards USING gin (title gin_trgm_ops);

-- If you have tags JSONB
CREATE INDEX IF NOT EXISTS idx_cards_tags ON cards USING gin (tags jsonb_path_ops);

WITH lists_cte AS (
  SELECT li.*, COALESCE(c.cards, '[]'::jsonb) AS cards
  FROM lists li
  LEFT JOIN (
    SELECT list_id, jsonb_agg(jsonb_build_object('id', id, 'title', title, 'position', position) ORDER BY position) AS cards
    FROM cards
    GROUP BY list_id
  ) c ON c.list_id = li.id
  WHERE li.board_id = $1
  ORDER BY li.position
)
SELECT b.*, jsonb_agg(lists_cte ORDER BY lists_cte.position) AS lists
FROM boards b
LEFT JOIN lists_cte ON lists_cte.board_id = b.id
WHERE b.id = $1
GROUP BY b.id;

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title TEXT,
    description TEXT,
    session_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    distance_km FLOAT,
    duration_min INTEGER,
    notes TEXT
);
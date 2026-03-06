CREATE TABLE pbs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    distance FLOAT,
    time TIME
);
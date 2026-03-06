CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title TEXT,
    target TEXT,
    start_date DATE,
    end_date DATE
);
package auth

import (
	"database/sql"
)

type Repository struct {
	DB *sql.DB
}

func (r *Repository) CreateUser(email, hash string) (int, error) {
	var id int
	err := r.DB.QueryRow(`
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id
	`, email, hash).Scan(&id)
	return id, err
}

func (r *Repository) GetUserByEmail(email string) (*User, error) {
	u := User{}
	err := r.DB.QueryRow(`
		SELECT id, email, password_hash, created_at
		FROM users WHERE email=$1
	`, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)

	if err != nil {
		return nil, err
	}
	return &u, nil
}
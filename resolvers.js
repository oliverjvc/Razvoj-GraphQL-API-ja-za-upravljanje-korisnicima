const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Greška pri otvaranju baze:', err);
  else console.log('Otvorena SQLite baza na', dbPath);
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  )
`);

const resolvers = {
  Query: {
    users: (_, args) => {
      const { name, email } = args;
      let query = `SELECT id, name, email FROM users`;
      const conditions = [];
      const params = [];

      if (name) {
        conditions.push(`name LIKE ?`);
        params.push(`%${name}%`);
      }

      if (email) {
        conditions.push(`email LIKE ?`);
        params.push(`%${email}%`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
      }

      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  },
  Mutation: {
    addUser: (_, { name, email }) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Neispravna email adresa");
      }

      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO users (name, email) VALUES (?, ?)`);
        stmt.run(name, email, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, name, email });
          }
        });
        stmt.finalize();
      });
    },
    deleteUser: (_, { id }) => {
      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
        stmt.run(id, function (err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        });
        stmt.finalize();
      });
    }
  }
};

module.exports = { resolvers };

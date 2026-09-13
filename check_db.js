const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data', 'shortbot.db');

// Abrir la base de datos
const db = new sqlite3.Database(dbPath);

// Verificar medios
const mediaQuery = 'SELECT * FROM media;';
const media = [];

try {
  db.all(mediaQuery, [], (err, rows) => {
    if (err) console.error('Error al leer medios:', err.message);
    else media.push(...rows);
    db.close();
    console.log(`Medios en la base de datos: ${media.length}`);
    media.forEach(m => {
      console.log(`- ${m.name} (${m.type})`);
    });
  });
} catch (error) {
  console.error('Error al abrir la base de datos:', error.message);
  db.close();
}

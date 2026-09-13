const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'shortbot.db');

async function initDb() {
  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  const run = (sql) => db.run(sql);

  run(`CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, sha TEXT NOT NULL UNIQUE, url TEXT NOT NULL, downloaded_path TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS hooks (id TEXT PRIMARY KEY, text TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS shorts (id TEXT PRIMARY KEY, hook_id TEXT NOT NULL, hook_text TEXT NOT NULL, media_ids TEXT NOT NULL DEFAULT '[]', title TEXT NOT NULL, description TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft', rendered_path TEXT, duration INTEGER, youtube_video_id TEXT, youtube_url TEXT, error_message TEXT, reject_reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY DEFAULT 'default', github_owner TEXT NOT NULL DEFAULT '', github_repo TEXT NOT NULL DEFAULT '', github_branch TEXT NOT NULL DEFAULT 'main', github_paths TEXT NOT NULL DEFAULT '["videos", "screenshots"]', github_token TEXT NOT NULL DEFAULT '', youtube_client_id TEXT NOT NULL DEFAULT '', youtube_client_secret TEXT NOT NULL DEFAULT '', youtube_refresh_token TEXT, sync_interval_minutes INTEGER NOT NULL DEFAULT 30, max_short_duration INTEGER NOT NULL DEFAULT 30, video_width INTEGER NOT NULL DEFAULT 1080, video_height INTEGER NOT NULL DEFAULT 1920, video_fps INTEGER NOT NULL DEFAULT 30, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS youtube_tokens (id TEXT PRIMARY KEY DEFAULT 'default', access_token TEXT NOT NULL, refresh_token TEXT NOT NULL, expiry_date INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)`);

  run(`CREATE TABLE IF NOT EXISTS hook_analytics (id TEXT PRIMARY KEY, short_id TEXT NOT NULL, hook_id TEXT NOT NULL, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, watch_time_seconds INTEGER DEFAULT 0, generated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, analyzed_at TEXT)`);
  run(`CREATE INDEX IF NOT EXISTS hook_analytics_short_idx ON hook_analytics(short_id)`);
  run(`CREATE INDEX IF NOT EXISTS hook_analytics_hook_idx ON hook_analytics(hook_id)`);
  run(`CREATE INDEX IF NOT EXISTS hook_analytics_views_idx ON hook_analytics(views)`);

  run(`CREATE INDEX IF NOT EXISTS media_sha_idx ON media(sha)`);
  run(`CREATE INDEX IF NOT EXISTS media_type_idx ON media(type)`);
  run(`CREATE INDEX IF NOT EXISTS shorts_status_idx ON shorts(status)`);
  run(`CREATE INDEX IF NOT EXISTS shorts_hook_idx ON shorts(hook_id)`);

const hooks = [
    '¿Necesitas un CV que realmente atraiga clientes?',
  'Tu CV está perdiendo oportunidades... esto lo arregla',
  'Cómo hacer un CV que consiga entrevistas en 24 horas',
  'El error #1 que cometen todos al crear su CV',
  'Plantilla de CV que triplica tus llamadas de RRHH',
  'Sin experiencia pero necesitas un CV ganador...',
  '¿Sabías que el 70% de los CV son rechazados por esto?',
  'El secreto profesional para un CV perfecto...',
  'Deja de hacer CV genéricos y empieza a destacar',
  'La forma rápida de crear un CV profesional sin complicaciones',
  'Esto cambió mi vida: CV sin experiencia',
  'No pierdas más tiempo con CV aburridos',
  '¿Quieres un CV que los reclutadores quieran leer?',
  'El truco que funciona para CVs sin experiencia',
  'Sin complicaciones, logra tu CV ideal en 1 hora',
  '¿Cansado de que rechacen tu CV? Prueba esto',
  'La diferencia entre un CV rechazado y uno aceptado',
  'Lo que aprendí sobre CVs en una semana',
  'Resultado garantizado: CV profesional en 1 día',
  '¿Sabías que puedes hacer un CV ganador gratis?',
  'El método definitivo para CV sin experiencia',
  'Cómo logré un CV perfecto en solo 1 día',
];

  const hookStmt = db.prepare('INSERT OR IGNORE INTO hooks (id, text, is_active) VALUES (?, ?, 1)');
  hooks.forEach(text => {
    hookStmt.run([crypto.randomUUID(), text]);
  });
  hookStmt.free();

  const existing = db.exec('SELECT 1 FROM settings WHERE id = \'default\'');
  if (existing.length === 0 || existing[0].values.length === 0) {
    run(`INSERT INTO settings (id, github_owner, github_repo, github_branch, github_paths, github_token, youtube_client_id, youtube_client_secret, sync_interval_minutes, max_short_duration, video_width, video_height, video_fps) VALUES ('default', '', '', 'main', '["videos", "fotos"]', '', '', '', 30, 30, 1080, 1920, 30)`);
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  db.close();

  console.log('✅ Database initialized at ' + dbPath);
}

initDb().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
const bcrypt = require("bcrypt");
const { get, all, run } = require("./db");

function isoDaysFromNow(days) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}
function ymd(dateObj) {
  const d = dateObj;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function seedIfEmpty() {
  // Seed only if no super admin exists
  const admin = await get("SELECT id FROM users WHERE role='SUPER_ADMIN' LIMIT 1");
  if (admin) return;

  const now = new Date().toISOString();

  // SUPER ADMIN (known credentials)
  const email = "admin@demo.com";
  const password = "admin123";
  const password_hash = await bcrypt.hash(password, 10);

  await run(
    `INSERT INTO users (name,email,password_hash,role,status,balance,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Super Admin", email, password_hash, "SUPER_ADMIN", "ACTIVE", 0, now]
  );

  // SPORT: HORSE RACING
  await run(
    `INSERT INTO sports (code,name,created_at) VALUES (?,?,?)`,
    ["HORSE_RACING", "Horse Racing", now]
  );
  const sport = await get("SELECT id FROM sports WHERE code='HORSE_RACING'");

  // Countries
  await run(`INSERT INTO countries (sport_id,name,country_code,created_at) VALUES (?,?,?,?)`,
    [sport.id, "South Africa", "ZA", now]
  );
  await run(`INSERT INTO countries (sport_id,name,country_code,created_at) VALUES (?,?,?,?)`,
    [sport.id, "United Kingdom", "GB", now]
  );

  const za = await get("SELECT id FROM countries WHERE sport_id=? AND name='South Africa'", [sport.id]);
  const gb = await get("SELECT id FROM countries WHERE sport_id=? AND name='United Kingdom'", [sport.id]);

  // Courses
  await run(`INSERT INTO courses (country_id,name,created_at) VALUES (?,?,?)`, [za.id, "Turffontein", now]);
  await run(`INSERT INTO courses (country_id,name,created_at) VALUES (?,?,?)`, [za.id, "Greyville", now]);
  await run(`INSERT INTO courses (country_id,name,created_at) VALUES (?,?,?)`, [gb.id, "Ascot", now]);

  const course = await get("SELECT id FROM courses WHERE country_id=? AND name='Turffontein'", [za.id]);

  // Race day (today)
  const today = new Date();
  const race_date = ymd(today);
  await run(`INSERT INTO race_days (course_id,race_date,created_at) VALUES (?,?,?)`, [course.id, race_date, now]);
  const raceDay = await get("SELECT id FROM race_days WHERE course_id=? AND race_date=?", [course.id, race_date]);

  // 4 races: 2 closed (past), 2 open (within 72 hours)
  // Race 1: 2 hours ago (closed by cron)
  // Race 2: 30 mins ago (closed by cron)
  // Race 3: +24 hours (open)
  // Race 4: +48 hours (open)
  const times = [
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isoDaysFromNow(1),
    isoDaysFromNow(2),
  ];
  for (let i = 0; i < 4; i++) {
    await run(
      `INSERT INTO races (race_day_id,race_number,race_datetime,status,created_at)
       VALUES (?,?,?,?,?)`,
      [raceDay.id, i + 1, times[i], "OPEN", now]
    );
  }

  const race3 = await get("SELECT id FROM races WHERE race_day_id=? AND race_number=3", [raceDay.id]);
  const race4 = await get("SELECT id FROM races WHERE race_day_id=? AND race_number=4", [raceDay.id]);

  // Horses for Race 3 and 4 (win + place odds + info)
  const horses = [
    { n: 1, name: "Harley's Pride", w: [12, 10], p: [6, 10], jockey: "M. Yeni", trainer: "S. Tarry", age: 4, notes: "Strong finisher" },
    { n: 2, name: "Kian's Joy", w: [2, 1], p: [1, 1], jockey: "G. Lerena", trainer: "F. Robinson", age: 5, notes: "Front runner" },
    { n: 3, name: "Alicia's Pride", w: [7, 2], p: [2, 1], jockey: "R. Danielson", trainer: "A. Fortune", age: 4, notes: "Good draw" },
    { n: 4, name: "Kilo's Jet", w: [5, 1], p: [5, 2], jockey: "K. Matsunyane", trainer: "P. Peter", age: 3, notes: "Improving" },
  ];

  for (const h of horses) {
    await run(
      `INSERT INTO horses (race_id,horse_number,name,win_num,win_den,place_num,place_den,jockey,trainer,age,notes,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [race3.id, h.n, h.name, h.w[0], h.w[1], h.p[0], h.p[1], h.jockey, h.trainer, h.age, h.notes, now]
    );
  }
  for (const h of horses) {
    await run(
      `INSERT INTO horses (race_id,horse_number,name,win_num,win_den,place_num,place_den,jockey,trainer,age,notes,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [race4.id, h.n, h.name, h.w[0], h.w[1], h.p[0], h.p[1], h.jockey, h.trainer, h.age, h.notes, now]
    );
  }

  // Demo users (players) (not login users)
  const placeholderHash = await bcrypt.hash("player", 10);
  await run(
    `INSERT INTO users (name,email,password_hash,role,status,balance,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Alyssa", "alyssa.player@demo.local", placeholderHash, "PLAYER", "ACTIVE", 10000, now]
  );
  await run(
    `INSERT INTO users (name,email,password_hash,role,status,balance,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Kiruben", "kiruben.player@demo.local", placeholderHash, "PLAYER", "ACTIVE", 10000, now]
  );

  console.log("Seeded demo data. Login: admin@demo.com / admin123");
}

module.exports = { seedIfEmpty };
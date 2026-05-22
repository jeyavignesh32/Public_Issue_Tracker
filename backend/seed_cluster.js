const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Generate a fixed central point for the cluster, slightly randomized to look realistic
    const centerLat = 20.5937;
    const centerLng = 78.9629;
    
    const [users] = await pool.query("SELECT id FROM users WHERE role = 'user' LIMIT 1");
    let userId = 1;
    if (users.length > 0) userId = users[0].id;

    console.log("Injecting 6 clustered pothole reports...");
    for (let i = 1; i <= 6; i++) {
        // Add tiny variation (under 10 meters) so they still get caught in the 250m grid
        const lat = centerLat + (Math.random() * 0.0002 - 0.0001);
        const lng = centerLng + (Math.random() * 0.0002 - 0.0001);

        await pool.query(
            "INSERT INTO complaints (user_id, title, description, type, location_text, latitude, longitude, priority, is_verified, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, `Massive Pothole Report - ${i}`, `Multiple vehicles damaged on this pothole ${i}`, 'Pothole', 'Main Highway Intersection', lat, lng, 'High', 1, 'Submitted']
        );
    }
    console.log("✅ Successfully injected 6 clustered Pothole complaints!");
    console.log("👉 Go check the Admin Dashboard to see the Red 🔥 Hotspot Bubble render instantly!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();

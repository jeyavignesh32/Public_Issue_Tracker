require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.query(`USE \`${process.env.DB_NAME}\``);
    console.log(`✅ Database '${process.env.DB_NAME}' ready.`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(200) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role ENUM('user','admin','worker') DEFAULT 'user',
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users table ready.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        type ENUM('Pothole','Streetlight','Garbage','Water Supply','Sewage','Flooding','Others') DEFAULT 'Others',
        location_text VARCHAR(400),
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        image_url VARCHAR(500),
        status ENUM('Submitted','Verified','Assigned','In Progress','Completed','Closed') DEFAULT 'Submitted',
        upvotes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ complaints table ready.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS complaint_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id INT NOT NULL,
        worker_id INT NOT NULL,
        notes TEXT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ complaint_assignments table ready.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS complaint_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id INT NOT NULL,
        updated_by INT NOT NULL,
        status VARCHAR(50),
        comment TEXT,
        proof_image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ complaint_updates table ready.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS upvotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (complaint_id, user_id),
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ upvotes table ready.');

    // Seed a default admin
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT IGNORE INTO users (name, email, password, role, phone)
      VALUES ('Admin User', 'admin@civictrack.com', ?, 'admin', '9999999999')
    `, [hash]);
    console.log('✅ Default admin seeded: admin@civictrack.com / admin123');

    console.log('\n🎉 Migration complete! All tables created successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();

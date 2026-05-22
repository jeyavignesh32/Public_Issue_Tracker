const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'civic_track'
  });

  try {
    console.log('🔄 Altering complaints table for Phase 5...');
    
    // Add priority column
    try {
      await connection.execute(`ALTER TABLE complaints ADD COLUMN priority ENUM('Low', 'Medium', 'High') DEFAULT 'Low'`);
      console.log('✅ Added priority column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ priority column already exists');
      else throw e;
    }

    // Add is_verified column
    try {
      await connection.execute(`ALTER TABLE complaints ADD COLUMN is_verified BOOLEAN DEFAULT TRUE`);
      console.log('✅ Added is_verified column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ is_verified column already exists');
      else throw e;
    }

    // Add ai_reason column
    try {
      await connection.execute(`ALTER TABLE complaints ADD COLUMN ai_reason TEXT`);
      console.log('✅ Added ai_reason column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ ai_reason column already exists');
      else throw e;
    }

    console.log('🎉 Database alteration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

alterDatabase();

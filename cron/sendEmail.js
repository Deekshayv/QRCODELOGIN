require('dotenv').config();
const { Pool } = require('pg');
const postmark = require('postmark');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false,
    sslmode: 'require'
  },
  idleTimeoutMillis: 30000
});

// Postmark client
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

async function sendDailyReport() {
  const client = await pool.connect();
  try {
    console.log('📅 Generating daily scan report...');
    
    // Get daily stats
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT phone_number) as unique_users,
        ARRAY_AGG(DISTINCT phone_number) as users
      FROM qr_codes
      WHERE scanned_at >= CURRENT_DATE
    `);

    // Send admin report
    await postmarkClient.sendEmail({
      "From": process.env.EMAIL_FROM,
      "To": process.env.ADMIN_EMAIL,
      "Subject": `Daily Scan Report - ${new Date().toLocaleDateString()}`,
      "TextBody": `
        Daily Scan Report:
        Total scans: ${stats.rows[0].total_scans}
        Unique users: ${stats.rows[0].unique_users}
        Generated at: ${new Date().toLocaleString()}
      `
    });

    console.log('✅ Daily report sent to admin');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send daily report:', error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run immediately if executed directly (for Render cron jobs)
if (require.main === module) {
  sendDailyReport()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// Export for testing
module.exports = { sendDailyReport };

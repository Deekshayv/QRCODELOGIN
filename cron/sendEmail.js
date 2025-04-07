require('dotenv').config();
const { Pool } = require('pg');
const postmark = require('postmark');

// Database connection
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_ySPh4vCn7mLU@ep-bold-field-a5wfrijr-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

// Postmark client
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// Function to get daily scan stats
async function getDailyStats() {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_scans,
                COUNT(DISTINCT phone_number) as unique_users
            FROM qr_codes
            WHERE scanned = TRUE
            AND scanned_at >= CURRENT_DATE
        `);
        return result.rows[0];
    } catch (error) {
        console.error("Database error:", error);
        return null;
    }
}

// Function to send email
async function sendDailyReport() {
    const stats = await getDailyStats();
    
    if (!stats) {
        console.error("Failed to fetch daily stats");
        return;
    }

    const emailText = `
        Daily QR Code Scan Report:
        - Total Scans Today: ${stats.total_scans}
        - Unique Users: ${stats.unique_users}
        
        Generated at: ${new Date().toISOString()}
    `;

    try {
        await postmarkClient.sendEmail({
            "From": "admin@yourdomain.com",
            "To": "admin@yourdomain.com", // Change to your admin email
            "Subject": "Daily QR Code Scan Report",
            "TextBody": emailText
        });
        console.log("Daily report email sent successfully!");
    } catch (error) {
        console.error("Failed to send email:", error);
    }
}

// Run daily at 11:59 PM
const cron = require('node-cron');
cron.schedule('59 23 * * *', () => {
    console.log('Running daily email report...');
    sendDailyReport();
});

// For manual testing
if (process.argv.includes('--manual')) {
    console.log('Running manual email report...');
    sendDailyReport()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

console.log('Cron job scheduler started...');

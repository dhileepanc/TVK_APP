const bcrypt = require("bcryptjs");
const { query } = require("./db");
const { APP_CONFIG } = require("./appConfig");
const { DEFAULT_POSTINGS, serializePostings } = require("./postings");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@naamjap.com";
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "Admin";

const SAMPLE_USERS = [
    { name: "Dhileepan", email: "dhileepan@example.com", mobile: "9840012345", posting: "Palani District Secretary", device: "MI 13 Pro (Android 14)", location: "Palani, Tamil Nadu", party: true },
    { name: "Priya", email: "priya@example.com", mobile: "9841012345", posting: null, device: "iPhone 13 (iOS 17)", location: "Madurai, Tamil Nadu", party: false },
    { name: "Arun", email: "arun@example.com", mobile: "9842012345", posting: "Vellore District Organiser", device: "Samsung Galaxy A52 (Android 13)", location: "Vellore, Tamil Nadu", party: true },
    { name: "Kavya", email: "kavya@example.com", mobile: "9843012345", posting: null, device: "OnePlus 11 (Android 14)", location: "Chennai, Tamil Nadu", party: false },
    { name: "Ravi", email: "ravi@example.com", mobile: "9844012345", posting: "Chennai Wing In-charge", device: "POCO X5 (Android 13)", location: "Chennai, Tamil Nadu", party: true },
    { name: "Meena", email: "meena@example.com", mobile: "9845012345", posting: null, device: "iPhone 12 (iOS 16)", location: "Coimbatore, Tamil Nadu", party: false },
    { name: "Selvam", email: "selvam@example.com", mobile: "9846012345", posting: "Salem District Secretary", device: "Realme 10 Pro (Android 13)", location: "Salem, Tamil Nadu", party: true },
    { name: "Lakshmi", email: "lakshmi@example.com", mobile: "9847012345", posting: "Madurai Wing In-charge", device: "Vivo V27 (Android 13)", location: "Madurai, Tamil Nadu", party: true },
    { name: "Anand", email: "anand@example.com", mobile: "9848012345", posting: null, device: "Redmi Note 12 (Android 13)", location: "Dindigul, Tamil Nadu", party: false },
    { name: "Divya", email: "divya@example.com", mobile: "9849012345", posting: null, device: "iPhone 11 (iOS 16)", location: "Erode, Tamil Nadu", party: false },
    { name: "Karun", email: "karun@example.com", mobile: "9850012345", posting: "Trichy District Organiser", device: "OnePlus Nord (Android 13)", location: "Trichy, Tamil Nadu", party: true },
];

async function initDb() {
    await query(`
        CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username VARCHAR(80) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email VARCHAR(255),
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'admin',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS posting_name VARCHAR(120)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_party_member BOOLEAN DEFAULT FALSE`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_device VARCHAR(120)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_location VARCHAR(120)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`);

    await query(`
        CREATE TABLE IF NOT EXISTS grievances (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS helps (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS party_nodes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            parent_id INTEGER REFERENCES party_nodes(id) ON DELETE CASCADE,
            posting_name VARCHAR(120),
            mobile VARCHAR(20),
            email VARCHAR(255),
            level VARCHAR(40),
            source VARCHAR(20) DEFAULT 'manual',
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await query(
        `ALTER TABLE party_nodes ADD COLUMN IF NOT EXISTS level VARCHAR(40)`
    );
    await query(
        `CREATE INDEX IF NOT EXISTS party_nodes_parent_idx ON party_nodes(parent_id)`
    );
    await query(
        `CREATE INDEX IF NOT EXISTS party_nodes_email_idx ON party_nodes(email)`
    );

    await query(`
        CREATE TABLE IF NOT EXISTS party_members (
            id SERIAL PRIMARY KEY,
            node_id INTEGER NOT NULL REFERENCES party_nodes(id) ON DELETE CASCADE,
            post_type VARCHAR(40) NOT NULL,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255),
            mobile VARCHAR(20),
            address TEXT,
            voter_id_number VARCHAR(40),
            aadhar_number VARCHAR(40),
            photo TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await query(
        `CREATE INDEX IF NOT EXISTS party_members_node_idx ON party_members(node_id)`
    );

    const settingsDefaults = {
        app_name: APP_CONFIG.app_name,
        android_url: APP_CONFIG.android_url,
        ios_url: APP_CONFIG.ios_url,
        postings: serializePostings(DEFAULT_POSTINGS),
    };

    for (const [key, value] of Object.entries(settingsDefaults)) {
        await query(
            `INSERT INTO app_settings (key, value) VALUES ($1, $2)
             ON CONFLICT (key) DO NOTHING`,
            [key, value]
        );
    }

    const existing = await query("SELECT id FROM admins LIMIT 1");
    if (existing.rowCount > 0) {
        await seedUsers();
        console.log("Database ready: admins table found (not seeding).");
        return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await query(
        `INSERT INTO admins (username, password_hash, email, full_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [ADMIN_USERNAME, passwordHash, ADMIN_EMAIL, ADMIN_FULL_NAME, "admin"]
    );
    await seedUsers();

    console.log(`Database ready: seeded admin user "${ADMIN_USERNAME}".`);
}

async function seedUsers() {
    const existing = await query("SELECT id FROM users LIMIT 1");

    if (existing.rowCount > 0) {
        console.log("Users table found (not seeding).");
        await insertMissingSampleUsers();
        await enrichUsers();
        await seedGrievances();
        return;
    }

    let index = 0;
    for (const user of SAMPLE_USERS) {
        await insertSampleUser(user, index);
        index += 1;
    }

    await seedGrievances();
    console.log(`Seeded ${SAMPLE_USERS.length} sample users.`);
}

async function insertSampleUser(user, index) {
    await query(
        `INSERT INTO users (name, email, mobile, posting_name, is_party_member, last_login_device, last_login_location, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - ($8 || ' days')::interval)`,
        [
            user.name,
            user.email,
            user.mobile,
            user.party ? user.posting : null,
            user.party,
            user.device,
            user.location,
            (index % 7) + 1,
        ]
    );
}

async function insertMissingSampleUsers() {
    const emailsResult = await query(`SELECT email FROM users`);
    const present = new Set(emailsResult.rows.map((row) => row.email));
    const missing = SAMPLE_USERS.filter((user) => !present.has(user.email));

    if (missing.length === 0) {
        console.log("All sample users already present.");
        return missing.length;
    }

    let index = 0;
    for (const user of missing) {
        await insertSampleUser(user, index);
        index += 1;
    }

    console.log(`Added ${missing.length} missing sample users.`);
    return missing.length;
}

async function enrichUsers() {
    const missing = await query(
        `SELECT id, email FROM users WHERE mobile IS NULL ORDER BY id`
    );
    if (missing.rowCount === 0) {
        console.log("Users already enriched with profile data.");
        return;
    }

    for (const user of missing.rows) {
        const profile = SAMPLE_USERS.find((item) => item.email === user.email);
        if (!profile) continue;

        await query(
            `UPDATE users SET
                mobile = $1,
                posting_name = $2,
                is_party_member = $3,
                last_login_device = $4,
                last_login_location = $5
             WHERE id = $6`,
            [
                profile.mobile,
                profile.party ? profile.posting : null,
                profile.party,
                profile.device,
                profile.location,
                user.id,
            ]
        );
    }

    console.log(`Enriched ${missing.rows.length} users with profile data.`);
}

async function seedGrievances() {
    const existing = await query("SELECT id FROM grievances LIMIT 1");
    if (existing.rowCount > 0) {
        console.log("Grievances table found (not seeding).");
        return;
    }

    const users = await query(`SELECT id FROM users ORDER BY id`);
    const pistatus = ["approved", "pending", "rejected"];
    const titles = [
        "Water supply issue in my area",
        "Road repair request",
        "Street light not working",
        "Garbage collection delay",
        "Drainage block complaint",
        "Bus stop shelter needed",
    ];

    for (const user of users.rows) {
        const count = 1 + (user.id % 4);
        for (let j = 0; j < count; j++) {
            const status = pistatus[(user.id + j * 2) % 3];
            await query(
                `INSERT INTO grievances (user_id, title, status) VALUES ($1, $2, $3)`,
                [user.id, titles[(user.id + j) % titles.length], status]
            );
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
    }

    const total = await query("SELECT COUNT(*) AS n FROM grievances");
    console.log(`Seeded ${total.rows[0].n} sample grievances.`);
}

module.exports = initDb;
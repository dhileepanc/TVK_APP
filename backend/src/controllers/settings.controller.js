const { query } = require("../config/db");
const { APP_CONFIG } = require("../config/appConfig");
const {
    parseSavedPostings,
    serializePostings,
} = require("../config/postings");
const {
    DEFAULT_LANGUAGES,
    parseSavedLanguages,
    serializeLanguages,
} = require("../config/languages");

async function loadSettings() {
    const result = await query("SELECT key, value FROM app_settings");
    const row = {};
    for (const r of result.rows) {
        row[r.key] = r.value;
    }

    const savedLanguages = parseSavedLanguages(row.languages);
    const languages = savedLanguages
        ? savedLanguages.list
        : DEFAULT_LANGUAGES.list;

    return {
        app_name: row.app_name || APP_CONFIG.app_name,
        android_url: row.android_url || APP_CONFIG.android_url,
        ios_url: row.ios_url || APP_CONFIG.ios_url,
        postings: parseSavedPostings(row.postings) || {},
        languages,
        default_language:
            (savedLanguages && savedLanguages.default_language) ||
            DEFAULT_LANGUAGES.default_language,
    };
}

async function upsertSetting(key, value) {
    await query(
        `INSERT INTO app_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
    );
}

async function getPublicSettings(req, res) {
    try {
        const settings = await loadSettings();
        return res.json({ success: true, settings });
    } catch (err) {
        console.error("Get public settings error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch settings.",
        });
    }
}

async function getSettings(req, res) {
    try {
        const settings = await loadSettings();
        return res.json({ success: true, settings });
    } catch (err) {
        console.error("Get settings error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch settings.",
        });
    }
}

async function updateSettings(req, res) {
    const { app_name, android_url, ios_url, postings, languages } =
        req.body || {};

    if (!app_name || !String(app_name).trim()) {
        return res.status(400).json({
            success: false,
            message: "App name is required.",
        });
    }

    try {
        await upsertSetting("app_name", String(app_name).trim());

        if (android_url !== undefined) {
            await upsertSetting("android_url", String(android_url).trim());
        }
        if (ios_url !== undefined) {
            await upsertSetting("ios_url", String(ios_url).trim());
        }
        if (postings !== undefined) {
            const parsed = parseSavedPostings(JSON.stringify(postings));
            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "Postings config is invalid.",
                });
            }
            await upsertSetting("postings", serializePostings(parsed));
        }
        if (languages !== undefined) {
            const parsed = parseSavedLanguages(JSON.stringify(languages));
            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "Languages config is invalid.",
                });
            }
            await upsertSetting("languages", serializeLanguages(parsed));
        }

        const settings = await loadSettings();
        return res.json({
            success: true,
            message: "Settings saved.",
            settings,
        });
    } catch (err) {
        console.error("Update settings error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save settings.",
        });
    }
}

module.exports = { getPublicSettings, getSettings, updateSettings };
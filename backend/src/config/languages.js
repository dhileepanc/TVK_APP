const DEFAULT_LANGUAGES = {
    list: [
        { id: "ta", name: "Tamil", native_name: "தமிழ்", enabled: true },
        { id: "en", name: "English", native_name: "English", enabled: true },
        { id: "hi", name: "Hindi", native_name: "हिन्दी", enabled: false },
        { id: "te", name: "Telugu", native_name: "తెలుగు", enabled: false },
        { id: "kn", name: "Kannada", native_name: "ಕನ್ನಡ", enabled: false },
        { id: "ml", name: "Malayalam", native_name: "മലയാളം", enabled: false },
    ],
    default_language: "ta",
};

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function normalizeLanguages(list) {
    const out = [];
    for (const item of Array.isArray(list) ? list : []) {
        const rawId =
            item && item.id != null
                ? String(item.id).trim()
                : item && item.code != null
                    ? String(item.code).trim()
                    : "";
        const id = rawId ? slugify(rawId) : "";
        const name =
            (item && item.name) || (item && item.label) || id || "";
        if (!id || !name) continue;

        out.push({
            id,
            name: String(name).trim(),
            native_name:
                (item && item.native_name) || String(name).trim(),
            enabled: item?.enabled !== false,
        });
    }
    return out;
}

function parseSavedLanguages(raw) {
    let data; try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!data || typeof data !== "object") return null;

    const out = {};
    out.list = normalizeLanguages(data.list);
    if (data.default_language) {
        out.default_language = slugify(String(data.default_language));
    }
    return out;
}

function serializeLanguages(list, defaultLanguage) {
    return JSON.stringify({
        list: normalizeLanguages(list),
        default_language: defaultLanguage
            ? slugify(String(defaultLanguage))
            : DEFAULT_LANGUAGES.default_language,
    });
}

module.exports = {
    DEFAULT_LANGUAGES,
    slugify,
    normalizeLanguages,
    parseSavedLanguages,
    serializeLanguages,
};

const DEFAULT_POSTINGS = {
    default: [
        { id: "secretary", name: "Secretary", count: 1 },
        { id: "joint_secretary", name: "Joint Secretary", count: 1 },
        { id: "treasurer", name: "Treasurer", count: 1 },
        { id: "deputy_secretary", name: "Deputy Secretary", count: 2 },
        { id: "ec_member", name: "Executive Committee Member", count: 10 },
    ],
    wing: [
        { id: "organizer", name: "Organizer", count: 1 },
        { id: "joint_organizer", name: "Joint Organizer", count: 10 },
    ],
};

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function normalizePosts(list) {
    const out = [];
    for (const item of Array.isArray(list) ? list : []) {
        const rawName =
            item && item.name != null
                ? String(item.name).trim()
                : item && item.label != null
                    ? String(item.label).trim()
                    : "";
        if (!rawName) continue;

        const rawId = item && item.id != null ? String(item.id).trim() : "";
        const id = rawId ? slugify(rawId) : slugify(rawName);
        if (!id) continue;

        const count = Math.max(1, parseInt(item.count ?? item.slots, 10) || 1);
        out.push({ id, name: rawName, count });
    }
    return out;
}

function parseSavedPostings(raw) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!data || typeof data !== "object") return null;

    const clean = {};
    for (const key of Object.keys(data)) {
        const posts = normalizePosts(data[key]);
        if (posts.length > 0) clean[key] = posts;
    }
    return clean;
}

function serializePostings(postings) {
    return JSON.stringify(postings || {});
}

module.exports = {
    DEFAULT_POSTINGS,
    slugify,
    normalizePosts,
    parseSavedPostings,
    serializePostings,
};
const XLSX = require("xlsx");
const { query } = require("../config/db");
const {
    DEFAULT_POSTINGS,
    parseSavedPostings,
} = require("../config/postings");

function toInternalPosts(posts) {
    return posts.map((post) => ({
        id: post.id,
        label: post.name,
        slots: post.count,
    }));
}

const WING_LEVELS = ["wing", "district-wing"];

function isWingLevel(level) {
    return Boolean(level && WING_LEVELS.includes(level));
}

async function getPostingsForLevel(level) {
    let saved = {};
    try {
        const result = await query(
            `SELECT value FROM app_settings WHERE key = 'postings'`
        );
        if (result.rowCount > 0) {
            const parsed = parseSavedPostings(result.rows[0].value);
            if (parsed) saved = parsed;
        }
    } catch (err) {
        console.error("Load postings settings error:", err);
    }

    if (saved[level]) return toInternalPosts(saved[level]);
    if (isWingLevel(level)) {
        if (saved.wing) return toInternalPosts(saved.wing);
        if (DEFAULT_POSTINGS.wing) return toInternalPosts(DEFAULT_POSTINGS.wing);
    }
    if (DEFAULT_POSTINGS[level]) return toInternalPosts(DEFAULT_POSTINGS[level]);
    return toInternalPosts(DEFAULT_POSTINGS.default);
}

function totalSlotsFor(posts) {
    return posts.reduce((sum, post) => sum + post.slots, 0);
}

const NODE_FIELDS = `
    id,
    title,
    parent_id,
    level,
    source,
    sort_order,
    created_at
`;

const MEMBER_FIELDS = `
    id,
    node_id,
    post_type,
    name,
    email,
    mobile,
    address,
    voter_id_number,
    aadhar_number,
    photo,
    created_at
`;

function buildTree(rows) {
    const nodeById = new Map();
    for (const row of rows) {
        nodeById.set(row.id, { ...row, children: [] });
    }

    const roots = [];
    for (const node of nodeById.values()) {
        if (node.parent_id && nodeById.has(node.parent_id)) {
            nodeById.get(node.parent_id).children.push(node);
        } else {
            roots.push(node);
        }
    }

    const sortNodes = (nodes) =>
        nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id);
    const sortTree = (nodes) => {
        sortNodes(nodes);
        for (const node of nodes) sortTree(node.children);
    };

    sortTree(roots);
    return roots;
}

function normalizeHeaders(row) {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        normalized[String(key).toLowerCase().replace(/[^a-z0-9]/g, "")] = value;
    }
    return normalized;
}

function normalizePost(input, posts) {
    if (!input) return null;
    const value = String(input).toLowerCase();
    const letters = value.replace(/[^a-z]/g, "");

    for (const post of posts) {
        if (post.id.replace(/_/g, "") === letters) return post.id;
    }
    for (const post of posts) {
        if (post.label.toLowerCase().replace(/[^a-z]/g, "") === letters) return post.id;
    }

    const byKeyword = (keywords, match) => {
        if (!keywords.some((k) => value.includes(k))) return null;
        const hit = posts.find(match);
        return hit ? hit.id : null;
    };

    return (
        byKeyword(["deputy"], (p) => p.label.toLowerCase().includes("deputy")) ||
        byKeyword(["joint"], (p) => p.label.toLowerCase().includes("joint")) ||
        byKeyword(["treasurer"], (p) => p.label.toLowerCase().includes("treasurer")) ||
        byKeyword(["secretary"], (p) => p.label.toLowerCase().includes("secretary")) ||
        byKeyword(
            ["organiz", "organiser", "organizer"],
            (p) => p.label.toLowerCase().includes("organiz")
        ) ||
        byKeyword(["executive", "committee", "ec member", "ec_member", "ec"], (p) => {
            const label = p.label.toLowerCase();
            return (
                label.includes("executive") ||
                label.includes("committee") ||
                label.includes("ec member") ||
                label === "ec"
            );
        }) ||
        null
    );
}

async function getMemberGrouping(nodeId, level) {
    const posts = await getPostingsForLevel(level);
    const byId = new Map(posts.map((post) => [post.id, post]));

    const result = await query(
        `SELECT ${MEMBER_FIELDS} FROM party_members WHERE node_id = $1 ORDER BY id`,
        [nodeId]
    );

    const counts = {};
    const byPost = {};
    for (const post of posts) {
        counts[post.id] = 0;
        byPost[post.id] = [];
    }

    for (const member of result.rows) {
        const postId = byId.has(member.post_type) ? member.post_type : "__other__";
        if (counts[postId] === undefined) {
            counts[postId] = 0;
            byPost[postId] = [];
        }
        counts[postId] += 1;
        byPost[postId].push(member);
    }

    const groups = posts.map((post) => ({
        post_type: post.id,
        label: post.label,
        slots: post.slots,
        count: counts[post.id],
        filled: counts[post.id] >= post.slots,
        members: byPost[post.id],
    }));

    if (byPost.__other__ && byPost.__other__.length > 0) {
        groups.push({
            post_type: "__other__",
            label: "Other",
            slots: Infinity,
            count: counts.__other__,
            filled: true,
            members: byPost.__other__,
        });
    }

    return {
        total: result.rows.length,
        totalSlots: totalSlotsFor(posts),
        groups,
    };
}

function normalizeMemberBody(body, posts) {
    return {
        name: String(body.name || "").trim(),
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        mobile: body.mobile ? String(body.mobile).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        voter_id_number: body.voter_id_number ? String(body.voter_id_number).trim() : null,
        aadhar_number: body.aadhar_number ? String(body.aadhar_number).trim() : null,
        photo: body.photo ? String(body.photo).trim() : null,
        post_type: normalizePost(body.post_type, posts),
    };
}

async function listParty(req, res) {
    try {
        const result = await query(`SELECT ${NODE_FIELDS} FROM party_nodes ORDER BY sort_order, id`);
        const countResult = await query(
            `SELECT node_id, COUNT(*)::int AS n FROM party_members GROUP BY node_id`
        );
        const countMap = new Map(countResult.rows.map((row) => [row.node_id, row.n]));

        const nodes = result.rows.map((node) => ({
            ...node,
            member_count: countMap.get(node.id) || 0,
        }));
        const tree = buildTree(nodes);

        return res.json({
            success: true,
            count: result.rows.length,
            tree,
            flat: nodes,
        });
    } catch (err) {
        console.error("List party error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch party structure.",
        });
    }
}

async function getPartyNode(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            `SELECT ${NODE_FIELDS} FROM party_nodes WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Party node not found.",
            });
        }

        const node = result.rows[0];
        const [children, members] = await Promise.all([
            query(
                `SELECT ${NODE_FIELDS} FROM party_nodes WHERE parent_id = $1 ORDER BY sort_order, id`,
                [id]
            ),
            getMemberGrouping(id, node.level),
        ]);

        return res.json({
            success: true,
            node: { ...node, children: children.rows },
            members,
        });
    } catch (err) {
        console.error("Get party node error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch party node.",
        });
    }
}

async function validateParent(parentId, selfId = null) {
    if (!parentId) return null;
    const parentResult = await query(
        `SELECT id FROM party_nodes WHERE id = $1`,
        [parentId]
    );
    if (parentResult.rowCount === 0 || (selfId && String(parentId) === String(selfId))) {
        const error = new Error("Selected parent node does not exist.");
        error.status = 400;
        throw error;
    }
    return parentResult.rows[0].id;
}

async function createPartyNode(req, res) {
    const { title, parent_id, level } = req.body || {};

    if (!title || !String(title).trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    try {
        const parentId = await validateParent(parent_id);
        const result = await query(
            `INSERT INTO party_nodes (title, parent_id, level, sort_order)
             VALUES ($1, $2, $3, $4) RETURNING id, title`,
            [
                String(title).trim(),
                parentId,
                level ? String(level).trim() : null,
                0,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Tree node added.",
            node: result.rows[0],
        });
    } catch (err) {
        console.error("Create party node error:", err);
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Failed to add tree node.",
        });
    }
}

async function updatePartyNode(req, res) {
    const { id } = req.params;
    const { title, parent_id, level } = req.body || {};

    if (!title || !String(title).trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    try {
        const parentId = await validateParent(parent_id, id);
        const result = await query(
            `UPDATE party_nodes SET
                title = $1,
                parent_id = $2,
                level = $3
             WHERE id = $4 RETURNING id, title`,
            [String(title).trim(), parentId, level ? String(level).trim() : null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Party node not found.",
            });
        }

        return res.json({
            success: true,
            message: "Tree node updated.",
        });
    } catch (err) {
        console.error("Update party node error:", err);
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Failed to update tree node.",
        });
    }
}

async function deletePartyNode(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM party_nodes WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Party node not found.",
            });
        }

        return res.json({
            success: true,
            message: "Tree node removed.",
        });
    } catch (err) {
        console.error("Delete party node error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete tree node.",
        });
    }
}

async function listNodeMembers(req, res) {
    const { id } = req.params;

    try {
        const nodeResult = await query(`SELECT id, title, level FROM party_nodes WHERE id = $1`, [id]);
        if (nodeResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Party node not found.",
            });
        }

        const members = await getMemberGrouping(id, nodeResult.rows[0].level);
        return res.json({ success: true, node: nodeResult.rows[0], members });
    } catch (err) {
        console.error("List members error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch members.",
        });
    }
}

async function addMember(req, res) {
    const { id } = req.params;

    try {
        const nodeResult = await query(`SELECT id, level FROM party_nodes WHERE id = $1`, [id]);
        if (nodeResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Party node not found." });
        }

        const posts = await getPostingsForLevel(nodeResult.rows[0].level);
        const member = normalizeMemberBody(req.body || {}, posts);

        if (!member.name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }
        const post = posts.find((p) => p.id === member.post_type);
        if (!member.post_type || !post) {
            return res.status(400).json({ success: false, message: "A valid post is required." });
        }

        const countResult = await query(
            `SELECT COUNT(*)::int AS n FROM party_members WHERE node_id = $1 AND post_type = $2`,
            [id, member.post_type]
        );
        const current = countResult.rows[0].n;

        if (current >= post.slots) {
            return res.status(400).json({
                success: false,
                message: `${post.label} slots are full (${post.slots}/${post.slots}).`,
            });
        }

        const totalSlots = totalSlotsFor(posts);
        const totalResult = await query(
            `SELECT COUNT(*)::int AS n FROM party_members WHERE node_id = $1`,
            [id]
        );
        if (totalResult.rows[0].n >= totalSlots) {
            return res.status(400).json({
                success: false,
                message: `This node already has all ${totalSlots} members.`,
            });
        }

        const result = await query(
            `INSERT INTO party_members (node_id, post_type, name, email, mobile, address, voter_id_number, aadhar_number, photo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${MEMBER_FIELDS}`,
            [
                id,
                member.post_type,
                member.name,
                member.email,
                member.mobile,
                member.address,
                member.voter_id_number,
                member.aadhar_number,
                member.photo,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Member added.",
            member: result.rows[0],
        });
    } catch (err) {
        console.error("Add member error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add member.",
        });
    }
}

async function updateMember(req, res) {
    const { id } = req.params;

    try {
        const existing = await query(
            `SELECT node_id, post_type FROM party_members WHERE id = $1`,
            [id]
        );
        if (existing.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Member not found." });
        }

        const nodeId = existing.rows[0].node_id;
        const nodeResult = await query(`SELECT level FROM party_nodes WHERE id = $1`, [nodeId]);
        const posts = await getPostingsForLevel(nodeResult.rowCount > 0 ? nodeResult.rows[0].level : null);
        const body = normalizeMemberBody(req.body || {}, posts);

        if (!body.name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        let postType = existing.rows[0].post_type;
        if (body.post_type && posts.some((p) => p.id === body.post_type)) {
            if (body.post_type !== existing.rows[0].post_type) {
                const post = posts.find((p) => p.id === body.post_type);
                const countResult = await query(
                    `SELECT COUNT(*)::int AS n FROM party_members WHERE node_id = $1 AND post_type = $2`,
                    [nodeId, body.post_type]
                );
                if (countResult.rows[0].n >= post.slots) {
                    return res.status(400).json({
                        success: false,
                        message: `${post.label} slots are full.`,
                    });
                }
            }
            postType = body.post_type;
        }

        const result = await query(
            `UPDATE party_members SET
                post_type = $1,
                name = $2,
                email = $3,
                mobile = $4,
                address = $5,
                voter_id_number = $6,
                aadhar_number = $7,
                photo = $8
             WHERE id = $9 RETURNING ${MEMBER_FIELDS}`,
            [
                postType,
                body.name,
                body.email,
                body.mobile,
                body.address,
                body.voter_id_number,
                body.aadhar_number,
                body.photo,
                id,
            ]
        );

        return res.json({
            success: true,
            message: "Member updated.",
            member: result.rows[0],
        });
    } catch (err) {
        console.error("Update member error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update member.",
        });
    }
}

async function deleteMember(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM party_members WHERE id = $1 RETURNING id",
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Member not found." });
        }

        return res.json({ success: true, message: "Member removed." });
    } catch (err) {
        console.error("Delete member error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to remove member.",
        });
    }
}

async function importMembers(req, res) {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No Excel file uploaded." });
    }

    const nodeId = req.body.node_id;
    if (!nodeId) {
        return res.status(400).json({ success: false, message: "Select a tree node to import into." });
    }

    let workbook;
    try {
        workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: "Could not read the uploaded file. Use a valid .xlsx or .xls file.",
        });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
        return res.status(400).json({ success: false, message: "The Excel file has no sheets." });
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rawRows.length === 0) {
        return res.status(400).json({ success: false, message: "The Excel file is empty." });
    }

    try {
        const nodeResult = await query(`SELECT id, level FROM party_nodes WHERE id = $1`, [nodeId]);
        if (nodeResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Party node not found." });
        }

        const posts = await getPostingsForLevel(nodeResult.rows[0].level);
        const postKeys = posts.map((post) => post.id);
        const existingAll = await query(
            `SELECT post_type FROM party_members WHERE node_id = $1`,
            [nodeId]
        );
        const counts = {};
        for (const key of postKeys) counts[key] = 0;
        for (const row of existingAll.rows) {
            if (counts[row.post_type] !== undefined) counts[row.post_type] += 1;
        }

        let added = 0;
        let skipped = 0;
        let invalid = 0;
        const errors = [];

        for (const raw of rawRows) {
            const row = normalizeHeaders(raw);
            const name = String(row.name || "").trim();
            if (!name) {
                skipped += 1;
                continue;
            }

            const postType = normalizePost(
                row.post || row.posttype || row.postingname || row.designation,
                posts
            );
            const post = posts.find((p) => p.id === postType);
            if (!postType || !post) {
                invalid += 1;
                continue;
            }

            if (counts[postType] >= post.slots) {
                errors.push(`${name}: ${post.label} slots are full.`);
                skipped += 1;
                continue;
            }

            await query(
                `INSERT INTO party_members (node_id, post_type, name, email, mobile, address, voter_id_number, aadhar_number, photo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    nodeId,
                    postType,
                    name,
                    String(row.email || "").trim().toLowerCase() || null,
                    String(row.mobile || "").trim() || null,
                    String(row.address || "").trim() || null,
                    String(row.voterid || row.voteridnumber || "").trim() || null,
                    String(row.aadhar || row.aadharnumber || "").trim() || null,
                    String(row.photo || "").trim() || null,
                ]
            );
            counts[postType] += 1;
            added += 1;
        }

        return res.json({
            success: true,
            message: `Imported ${added} member(s).`,
            summary: { added, skipped, invalid, errors },
        });
    } catch (err) {
        console.error("Import members error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to import members from Excel.",
        });
    }
}

module.exports = {
    listParty,
    getPartyNode,
    createPartyNode,
    updatePartyNode,
    deletePartyNode,
    listNodeMembers,
    addMember,
    updateMember,
    deleteMember,
    importMembers,
};
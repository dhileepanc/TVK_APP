const { query } = require("../config/db");

const LIST_FIELDS = `
    id,
    name,
    email,
    mobile,
    posting_name,
    is_party_member
`;

async function listUsers(req, res) {
    const { type } = req.query || {};

    try {
        let sql = `SELECT ${LIST_FIELDS} FROM users`;
        const params = [];
        const conditions = [];

        if (type === "party") {
            conditions.push("is_party_member = TRUE");
        }

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(" AND ")}`;
        }

        sql += " ORDER BY id";

        const result = await query(sql, params);
        return res.json({
            success: true,
            count: result.rows.length,
            users: result.rows,
        });
    } catch (err) {
        console.error("List users error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users.",
        });
    }
}

async function getUser(req, res) {
    const { id } = req.params;

    try {
        const userResult = await query(
            `SELECT
                id,
                name,
                email,
                mobile,
                posting_name,
                is_party_member,
                profile_image,
                last_login_device,
                last_login_location,
                last_login_at,
                created_at
             FROM users WHERE id = $1`,
            [id]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const user = userResult.rows[0];

        const statsResult = await query(
            `SELECT
                COUNT(*)::int AS total,
                COALESCE(COUNT(*) FILTER (WHERE status = 'approved'), 0)::int AS approved,
                COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0)::int AS pending,
                COALESCE(COUNT(*) FILTER (WHERE status = 'rejected'), 0)::int AS rejected
             FROM grievances WHERE user_id = $1`,
            [id]
        );

        const stats = statsResult.rows[0];
        const total = Number(stats.total) || 0;

        const percent = (count) =>
            total === 0 ? 0 : Math.round((count / total) * 100);

        return res.json({
            success: true,
            user: {
                ...user,
                grievances: {
                    total,
                    approved: Number(stats.approved),
                    pending: Number(stats.pending),
                    rejected: Number(stats.rejected),
                    approvedPercent: percent(stats.approved),
                    pendingPercent: percent(stats.pending),
                    rejectedPercent: percent(stats.rejected),
                },
            },
        });
    } catch (err) {
        console.error("Get user error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user detail.",
        });
    }
}

async function updateUser(req, res) {
    const { id } = req.params;
    const {
        name,
        email,
        mobile,
        posting_name,
        is_party_member,
        profile_image,
        last_login_device,
        last_login_location,
    } = req.body || {};

    if (!name || !String(name).trim()) {
        return res.status(400).json({
            success: false,
            message: "Name is required.",
        });
    }

    if (!email || !String(email).trim()) {
        return res.status(400).json({
            success: false,
            message: "Email is required.",
        });
    }

    try {
        const result = await query(
            `UPDATE users SET
                name = $1,
                email = $2,
                mobile = $3,
                posting_name = $4,
                is_party_member = $5,
                profile_image = $6,
                last_login_device = $7,
                last_login_location = $8
             WHERE id = $9 RETURNING id`,
            [
                String(name).trim(),
                String(email).trim(),
                mobile ? String(mobile).trim() : null,
                posting_name ? String(posting_name).trim() : null,
                Boolean(is_party_member),
                profile_image ? String(profile_image).trim() : null,
                last_login_device ? String(last_login_device).trim() : null,
                last_login_location ? String(last_login_location).trim() : null,
                id,
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.json({
            success: true,
            message: "User updated.",
        });
    } catch (err) {
        console.error("Update user error:", err);
        if (err.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Email already exists for another user.",
            });
        }
        return res.status(500).json({
            success: false,
            message: "Failed to update user.",
        });
    }
}

async function deleteUser(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM users WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.json({
            success: true,
            message: "User deleted.",
        });
    } catch (err) {
        console.error("Delete user error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete user.",
        });
    }
}

module.exports = { listUsers, getUser, updateUser, deleteUser };
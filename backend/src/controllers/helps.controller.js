const { query } = require("../config/db");

async function createHelp(req, res) {
    const { title, content } = req.body || {};

    if (!title || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Content is required.",
        });
    }

    try {
        const result = await query(
            "INSERT INTO helps (title, content) VALUES ($1, $2) RETURNING id",
            [title.trim(), content]
        );

        return res.status(201).json({
            success: true,
            message: "Help added.",
            id: result.rows[0].id,
        });
    } catch (err) {
        console.error("Create help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add help.",
        });
    }
}

async function listHelps(req, res) {
    try {
        const result = await query(
            "SELECT id, title, created_at FROM helps ORDER BY id DESC"
        );

        return res.json({
            success: true,
            count: result.rowCount,
            helps: result.rows,
        });
    } catch (err) {
        console.error("List helps error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch helps.",
        });
    }
}

async function getHelp(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT id, title, content, created_at FROM helps WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Help not found.",
            });
        }

        return res.json({
            success: true,
            help: result.rows[0],
        });
    } catch (err) {
        console.error("Get help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch help.",
        });
    }
}

async function updateHelp(req, res) {
    const { id } = req.params;
    const { title, content } = req.body || {};

    if (!title || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Content is required.",
        });
    }

    try {
        const result = await query(
            "UPDATE helps SET title = $1, content = $2 WHERE id = $3 RETURNING id",
            [title.trim(), content, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Help not found.",
            });
        }

        return res.json({
            success: true,
            message: "Help updated.",
        });
    } catch (err) {
        console.error("Update help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update help.",
        });
    }
}

async function deleteHelp(req, res) {
    const { id } = req.params;

    try {
        const result = await query("DELETE FROM helps WHERE id = $1 RETURNING id", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Help not found.",
            });
        }

        return res.json({
            success: true,
            message: "Help deleted.",
        });
    } catch (err) {
        console.error("Delete help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete help.",
        });
    }
}

module.exports = {
    createHelp,
    listHelps,
    getHelp,
    updateHelp,
    deleteHelp,
};
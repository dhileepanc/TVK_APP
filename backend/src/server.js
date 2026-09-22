const express = require("express");
const cors = require("cors");
require("dotenv").config();

const initDb = require("./config/initDb");
const adminAuthRoutes = require("./routes/adminAuth.routes");
const usersRoutes = require("./routes/users.routes");
const helpsRoutes = require("./routes/helps.routes");
const settingsRoutes = require("./routes/settings.routes");
const partyRoutes = require("./routes/party.routes");
const settingsController = require("./controllers/settings.controller");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", usersRoutes);
app.use("/api/admin", helpsRoutes);
app.use("/api/admin", settingsRoutes);
app.use("/api/admin", partyRoutes);

// Public settings
app.get("/api/app-settings", settingsController.getPublicSettings);

// Test API
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: `${require("./config/appConfig").APP_CONFIG.app_name} Backend API is running`,
    });
});

// Start server
initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Backend running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Failed to initialize database:", err.message);
        process.exit(1);
    });
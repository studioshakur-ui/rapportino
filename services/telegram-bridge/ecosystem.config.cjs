// PM2 ecosystem — Windows compatible
// Lance node dist/main.js (JS compilé, pas de tsx, pas de npx)
const path = require("path");

module.exports = {
  apps: [{
    name:            "core-telegram",
    script:          path.resolve(__dirname, "dist/main.js"),
    cwd:             __dirname,
    env_file:        path.resolve(__dirname, ".env"),
    restart_delay:   5000,
    max_restarts:    10,
    watch:           false,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }]
};

const { buildAdminReport, PERIOD_CONFIG } = require("../services/adminReportService");

class AdminController {
  static async report(req, res) {
    const period = String(req.query.period || "daily").toLowerCase();
    const selected = PERIOD_CONFIG[period] ? period : "daily";
    res.json({ data: await buildAdminReport(selected) });
  }
}

module.exports = AdminController;

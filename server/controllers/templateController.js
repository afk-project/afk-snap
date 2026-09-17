const { Template } = require("../models");

class TemplateController {
  static async list(_req, res) {
    const templates = await Template.findAll({ where: { active: true }, order: [["id", "ASC"]] });
    res.json({ data: templates });
  }
}

module.exports = TemplateController;

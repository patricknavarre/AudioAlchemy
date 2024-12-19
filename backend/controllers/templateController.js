const Template = require('../models/Template');

exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template', error: error.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, description, type, settings } = req.body;
    
    const template = new Template({
      name,
      description,
      type,
      settings
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error creating template', error: error.message });
  }
}; 
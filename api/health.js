module.exports = async (req, res) => {
  res.json({ ok: true, message: 'API functions working!', timestamp: new Date().toISOString() });
};
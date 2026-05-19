module.exports = async (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API functions working! (health alias)',
    timestamp: new Date().toISOString()
  });
};


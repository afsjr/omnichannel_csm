module.exports = async (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API functions working!',
    timestamp: new Date().toISOString()
  });
};


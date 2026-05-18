module.exports = async (req, res) => {
  res.status(200).json({ 
    ok: true, 
    message: 'API working!',
    files: ['auth', 'messages', 'send', 'webhook', 'debug']
  });
};
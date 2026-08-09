function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { notFoundHandler };

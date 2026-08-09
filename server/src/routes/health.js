const express = require('express');
const { checkHealth } = require('../db/connection');
const logger = require('../logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await checkHealth();
    res.json({
      status: 'ok',
      database: 'connected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Health check database ping failed', { error: err.message });
    res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      message: 'Database is unreachable',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

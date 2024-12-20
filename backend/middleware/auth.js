const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    console.log('Auth middleware:', {
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[exists]' : '[missing]'
      },
      method: req.method,
      path: req.path,
      origin: req.get('origin'),
      host: req.get('host'),
      url: req.url,
      body: req.method === 'POST' ? req.body : undefined
    });

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
      console.log('Attempting to verify token:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 10) + '...',
        jwtSecretLength: process.env.JWT_SECRET.length
      });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified:', {
        userId: decoded.userId,
        exp: new Date(decoded.exp * 1000).toISOString(),
        iat: new Date(decoded.iat * 1000).toISOString(),
        timeUntilExpiry: Math.floor((decoded.exp * 1000 - Date.now()) / 1000 / 60) + ' minutes'
      });
      req.userId = decoded.userId;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', {
        error: jwtError.message,
        name: jwtError.name,
        expiredAt: jwtError.expiredAt,
        token: token.substring(0, 10) + '...',
        tokenLength: token.length,
        jwtSecretLength: process.env.JWT_SECRET.length
      });
      res.status(401).json({ 
        message: 'Invalid token',
        details: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      headers: req.headers,
      path: req.path,
      method: req.method
    });
    res.status(401).json({ message: 'Authentication error' });
  }
}; 
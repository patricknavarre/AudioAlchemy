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
      host: req.get('host')
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified:', {
        userId: decoded.userId,
        exp: new Date(decoded.exp * 1000).toISOString(),
        iat: new Date(decoded.iat * 1000).toISOString()
      });
      req.userId = decoded.userId;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', {
        error: jwtError.message,
        name: jwtError.name,
        expiredAt: jwtError.expiredAt,
        token: token.substring(0, 10) + '...'
      });
      res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(401).json({ message: 'Authentication error' });
  }
}; 
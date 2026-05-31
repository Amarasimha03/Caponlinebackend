const jwt = require('jsonwebtoken');
const { querySheets } = require('../services/googleSheets');
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

    const secret = process.env.JWT_SECRET || 'onlinetest_jwt_secret_2024_secure_key';
    const decoded = jwt.verify(token, secret);
    
    // Fetch all employees from Google Sheets
    const empRes = await querySheets('getEmployees');
    const employees = empRes.data || [];
    let employee = employees.find(e => String(e._id) === String(decoded.id));
    
    if (!employee && decoded.id === 'admin_id') {
      employee = {
        _id: 'admin_id',
        email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
        role: 'admin',
        isActive: true,
        fullName: 'Admin User'
      };
    }

    if (!employee) return res.status(401).json({ success: false, message: 'User not found' });
    if (!employee.isActive || employee.isActive === 'false') return res.status(403).json({ success: false, message: 'Account deactivated' });

    req.user = employee;
    next();
  } catch (err) {
    console.error('AUTH MIDDLEWARE ERROR:', err.message);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }
    return res.status(500).json({ success: false, message: 'Server error validating user session' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

exports.generateToken = (id) => {
  const expiresIn = id === 'admin_id' ? '3650d' : (process.env.JWT_EXPIRES_IN || '30d');
  const secret = process.env.JWT_SECRET || 'onlinetest_jwt_secret_2024_secure_key';
  return jwt.sign({ id }, secret, { expiresIn });
};

const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////
// GENERATE TOKEN
//////////////////////////////////////////////////////
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: process.env.JWT_ISSUER || "QUE-Accounting",
    audience: process.env.JWT_AUDIENCE || "QUE-Accounting-Users",
  });
};

//////////////////////////////////////////////////////
// VERIFY TOKEN
//////////////////////////////////////////////////////
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || "QUE-Accounting",
      audience: process.env.JWT_AUDIENCE || "QUE-Accounting-Users",
    });

    return { success: true, payload: decoded };
  } catch (error) {
    return { success: false, error };
  }
};

//////////////////////////////////////////////////////
// EXTRACT TOKEN
//////////////////////////////////////////////////////
const extractTokenFromHeader = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
};

//////////////////////////////////////////////////////
// DECODE ONLY (DEBUG)
//////////////////////////////////////////////////////
const decodeToken = (token) => jwt.decode(token);

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  decodeToken,
};

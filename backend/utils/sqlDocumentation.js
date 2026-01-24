// backend/utils/sqlDocumentation.js

const { generateValidatedSQL, formatSQLForDisplay } = require('./sqlGenerator');

// Re-export the new validated functions
const generateSQLDocumentation = generateValidatedSQL;

module.exports = { generateSQLDocumentation, formatSQLForDisplay };
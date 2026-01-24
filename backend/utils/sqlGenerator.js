
const { generateSchemaWithTypes } = require('./schemaDetector');
const { mapColumnNames } = require('./columnMapper');

/**
 * Generates validated SQL queries with proper column names and types
 * Prevents "undefined" and wrong data types
 */

const generateValidatedSQL = (csvData, metrics, availableColumns) => {
  const { headers, data } = csvData;
  const schema = generateSchemaWithTypes(csvData);
  const columnMap = mapColumnNames(csvData);
  const sqlQueries = [];

  // 1. Table Structure with CORRECT data types
  const createTableSQL = `CREATE TABLE transactions (\n${schema.map(col => 
    `  ${col.sqlName} ${col.dataType}`
  ).join(',\n')}\n);`;

  sqlQueries.push({
    section: "📊 Table Structure (Smart Schema)",
    sql: createTableSQL,
    note: "✅ Data types auto-detected from your data"
  });

  // 2. Revenue Analysis - ONLY if revenue column exists
  if (columnMap.revenueColumn) {
    // Calculate actual total from data
const actualTotal = csvData.data.reduce((sum, row) => {
  const val = parseFloat(row[columnMap.revenueIndex]);
  return sum + (isNaN(val) ? 0 : val);
}, 0);

const revenueSQL = `SELECT 
  SUM(${columnMap.revenueSqlName}) AS total_revenue,
  AVG(${columnMap.revenueSqlName}) AS avg_revenue,
  MAX(${columnMap.revenueSqlName}) AS max_revenue,
  MIN(${columnMap.revenueSqlName}) AS min_revenue
FROM transactions;
-- Total: ₹${actualTotal.toLocaleString('en-IN')}`;

    sqlQueries.push({
      section: "💰 Revenue Analysis",
      sql: revenueSQL,
      note: `✅ Using column: ${columnMap.revenueColumn}`
    });
  } else {
    sqlQueries.push({
      section: "⚠️ Revenue Analysis",
      sql: `-- Revenue analysis not available\n-- REASON: No revenue/sales/amount column found\n-- Available columns: ${headers.join(', ')}`,
      note: "❌ Missing required column"
    });
  }

  // 3. ARPU Analysis - Check if it's pre-calculated or needs calculation
  if (columnMap.arpuColumn) {
    // ARPU is already calculated in the data
    const arpuSQL = `SELECT 
  AVG(${columnMap.arpuSqlName}) AS average_arpu,
  MAX(${columnMap.arpuSqlName}) AS max_arpu,
  MIN(${columnMap.arpuSqlName}) AS min_arpu
FROM transactions;
-- Note: ARPU is pre-calculated in your data`;

    sqlQueries.push({
      section: "👥 ARPU Analysis (Pre-calculated)",
      sql: arpuSQL,
      note: `✅ Using existing column: ${columnMap.arpuColumn}`
    });
  } else if (columnMap.userColumn && columnMap.revenueColumn) {
    // Calculate ARPU from user_id and revenue
    const arpuSQL = `SELECT 
  COUNT(DISTINCT ${columnMap.userSqlName}) AS unique_users,
  SUM(${columnMap.revenueSqlName}) AS total_revenue,
  SUM(${columnMap.revenueSqlName}) / COUNT(DISTINCT ${columnMap.userSqlName}) AS calculated_arpu
FROM transactions;
-- ARPU: ₹${metrics.arpu?.toLocaleString() || 'N/A'}`;

    sqlQueries.push({
      section: "👥 ARPU Analysis (Calculated)",
      sql: arpuSQL,
      note: `✅ Calculated from ${columnMap.userColumn} + ${columnMap.revenueColumn}`
    });
  } else {
    sqlQueries.push({
      section: "⚠️ ARPU Analysis",
      sql: `-- ARPU cannot be calculated\n-- REASON: Missing required columns\n-- NEEDED: Either 'ARPU' column OR ('user_id' + 'revenue')\n-- Available: ${headers.join(', ')}`,
      note: "❌ Not possible with current data structure"
    });
  }

  // 4. Time-Series Analysis - ONLY if date column exists
  if (columnMap.dateColumn && columnMap.revenueColumn) {
    const timeSeriesSQL = `SELECT 
  ${columnMap.dateSqlName},
  SUM(${columnMap.revenueSqlName}) AS period_revenue,
  COUNT(*) AS record_count
FROM transactions
GROUP BY ${columnMap.dateSqlName}
ORDER BY ${columnMap.dateSqlName};`;

    sqlQueries.push({
      section: "📅 Time-Series Analysis",
      sql: timeSeriesSQL,
      note: `✅ Grouping by: ${columnMap.dateColumn}`
    });
  }

  // 5. Channel Performance - ONLY if channel column exists
  if (columnMap.channelColumn && columnMap.revenueColumn) {
    const channelSQL = `SELECT 
  ${columnMap.channelSqlName},
  SUM(${columnMap.revenueSqlName}) AS channel_revenue,
  COUNT(*) AS transactions,
  AVG(${columnMap.revenueSqlName}) AS avg_per_transaction
FROM transactions
GROUP BY ${columnMap.channelSqlName}
ORDER BY channel_revenue DESC;`;

    sqlQueries.push({
      section: "📡 Channel Performance",
      sql: channelSQL,
      note: `✅ Analyzing: ${columnMap.channelColumn}`
    });
  }

  return sqlQueries;
};

const formatSQLForDisplay = (sqlQueries) => {
  let formatted = `\n╔═══════════════════════════════════════╗\n║   SQL QUERY LOGIC                      ║\n╚═══════════════════════════════════════╝\n\n`;
  sqlQueries.forEach(query => {
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${query.section}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n\`\`\`sql\n${query.sql}\n\`\`\`\n\n${query.note ? `📝 ${query.note}\n\n` : ''}`;
  });
  return formatted;
};

module.exports = { generateValidatedSQL, formatSQLForDisplay };
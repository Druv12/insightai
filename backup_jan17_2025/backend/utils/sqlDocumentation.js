// backend/utils/sqlDocumentation.js

const generateSQLDocumentation = (csvData, metrics, availableColumns) => {
  const { headers, data } = csvData;
  const sqlQueries = [];
  
  sqlQueries.push({
    section: "📊 Table Structure",
    sql: `CREATE TABLE transactions (\n${headers.map(h => `  ${h.replace(/[^a-zA-Z0-9_]/g, '_')} VARCHAR(255)`).join(',\n')}\n);`
  });
  
  if (availableColumns.hasRevenue) {
    sqlQueries.push({
      section: "💰 Revenue Analysis",
      sql: `SELECT SUM(${availableColumns.revenueColumn}) AS total_revenue,\n  AVG(${availableColumns.revenueColumn}) AS avg_revenue\nFROM transactions;\n-- Total: ₹${metrics.totalRevenue?.toLocaleString() || 'N/A'}`
    });
  }
  
  if (availableColumns.hasUserID && availableColumns.hasRevenue) {
    sqlQueries.push({
      section: "👥 User Analysis (ARPU)",
      sql: `SELECT COUNT(DISTINCT ${availableColumns.userColumn}) AS unique_users,\n  SUM(${availableColumns.revenueColumn}) / COUNT(DISTINCT ${availableColumns.userColumn}) AS arpu\nFROM transactions;\n-- ARPU: ₹${metrics.arpu?.toLocaleString() || 'N/A'}`,
      note: "✅ Valid - both user_id and revenue exist"
    });
  } else if (!availableColumns.hasUserID) {
    sqlQueries.push({
      section: "⚠️ User Analysis",
      sql: `-- ARPU cannot be calculated\n-- REASON: No user_id column\n-- REQUIRED: user_id + revenue columns`,
      note: "❌ Not possible with current data"
    });
  }
  
  if (availableColumns.hasDate && availableColumns.hasRevenue) {
    sqlQueries.push({
      section: "📅 Time-Series Analysis",
      sql: `SELECT ${availableColumns.dateColumn},\n  SUM(${availableColumns.revenueColumn}) AS period_revenue\nFROM transactions\nGROUP BY ${availableColumns.dateColumn}\nORDER BY ${availableColumns.dateColumn};`
    });
  }
  
  if (availableColumns.hasChannel && availableColumns.hasRevenue) {
    sqlQueries.push({
      section: "📡 Channel Performance",
      sql: `SELECT ${availableColumns.channelColumn},\n  SUM(${availableColumns.revenueColumn}) AS channel_revenue\nFROM transactions\nGROUP BY ${availableColumns.channelColumn}\nORDER BY channel_revenue DESC;`
    });
  }
  
  return sqlQueries;
};

const formatSQLForDisplay = (sqlQueries) => {
  let formatted = `\n╔════════════════════════════════════════╗\n║   SQL QUERY LOGIC                      ║\n╚════════════════════════════════════════╝\n\n`;
  sqlQueries.forEach(query => {
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${query.section}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n\`\`\`sql\n${query.sql}\n\`\`\`\n\n${query.note ? `📝 ${query.note}\n\n` : ''}`;
  });
  return formatted;
};

module.exports = { generateSQLDocumentation, formatSQLForDisplay };
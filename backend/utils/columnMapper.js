/**
 * Maps CSV headers to their actual column names and detects data types
 * Prevents "undefined" in SQL queries
 */

const mapColumnNames = (csvData) => {
  const { headers, data } = csvData;
  const columnMap = {};

  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase().replace(/[_\s]/g, '');
    const sqlSafeName = header.replace(/[^a-zA-Z0-9_]/g, '_');

    // Detect what this column represents
    if (lowerHeader.includes('revenue') || lowerHeader.includes('sales') || lowerHeader.includes('amount')) {
      columnMap.revenueColumn = header;
      columnMap.revenueIndex = index;
      columnMap.revenueSqlName = sqlSafeName;
    }
    
    if (lowerHeader.includes('user') || lowerHeader.includes('customer') || lowerHeader.includes('subscriber')) {
      columnMap.userColumn = header;
      columnMap.userIndex = index;
      columnMap.userSqlName = sqlSafeName;
    }
    
    if (lowerHeader.includes('date') || lowerHeader.includes('month') || lowerHeader.includes('time')) {
      columnMap.dateColumn = header;
      columnMap.dateIndex = index;
      columnMap.dateSqlName = sqlSafeName;
    }
    
    if (lowerHeader.includes('channel') || lowerHeader.includes('source') || lowerHeader.includes('medium')) {
      columnMap.channelColumn = header;
      columnMap.channelIndex = index;
      columnMap.channelSqlName = sqlSafeName;
    }

    if (lowerHeader.includes('arpu')) {
      columnMap.arpuColumn = header;
      columnMap.arpuIndex = index;
      columnMap.arpuSqlName = sqlSafeName;
    }
  });

  return columnMap;
};

module.exports = { mapColumnNames };
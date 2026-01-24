// backend/utils/schemaDetector.js

/**
 * Detects proper SQL data types from CSV data
 * Fixes VARCHAR(255) for numeric columns
 */

const detectColumnType = (columnName, values) => {
  const lowerName = columnName.toLowerCase();
  
  // Sample up to 100 values for type detection
  const sampleValues = values.slice(0, 100).filter(v => v !== null && v !== undefined && v !== '');
  
  if (sampleValues.length === 0) {
    return 'VARCHAR(255)';
  }

  // Check if all values are numbers
  const numericValues = sampleValues.filter(v => !isNaN(parseFloat(v)));
  const isNumeric = numericValues.length / sampleValues.length > 0.8;

  if (isNumeric) {
    // Check if values have decimals
    const hasDecimals = sampleValues.some(v => String(v).includes('.'));
    
    if (hasDecimals) {
      return 'DECIMAL(12,2)';
    } else {
      // Check if it's a large number (like IDs)
      const maxValue = Math.max(...sampleValues.map(v => Math.abs(parseFloat(v))));
      if (maxValue > 2147483647) {
        return 'BIGINT';
      } else {
        return 'INT';
      }
    }
  }

  // Check for date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,  // 2024-01-01
    /^\d{2}\/\d{2}\/\d{4}$/, // 01/01/2024
    /^\d{4}\/\d{2}\/\d{2}$/, // 2024/01/01
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i // Month names
  ];
  
  const isDate = sampleValues.some(v => 
    datePatterns.some(pattern => pattern.test(String(v)))
  );
  
  if (isDate || lowerName.includes('date') || lowerName.includes('month')) {
    return 'VARCHAR(20)'; // Flexible for various date formats
  }

  // Default to VARCHAR with appropriate length
  const maxLength = Math.max(...sampleValues.map(v => String(v).length));
  
  if (maxLength <= 50) {
    return 'VARCHAR(50)';
  } else if (maxLength <= 100) {
    return 'VARCHAR(100)';
  } else {
    return 'VARCHAR(255)';
  }
};

const generateSchemaWithTypes = (csvData) => {
  const { headers, data } = csvData;
  const schema = [];

  headers.forEach((header, index) => {
    const columnValues = data.map(row => row[index]);
    const sqlType = detectColumnType(header, columnValues);
    const sqlSafeName = header.replace(/[^a-zA-Z0-9_]/g, '_');
    
    schema.push({
      originalName: header,
      sqlName: sqlSafeName,
      dataType: sqlType
    });
  });

  return schema;
};

module.exports = { detectColumnType, generateSchemaWithTypes };
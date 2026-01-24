// backend/utils/productionValidator.js

/**
 * PRODUCTION-GRADE VALIDATION
 * Prevents ALL hallucinated metrics
 */

const validateDataIntegrity = (csvData) => {
  const { headers, data } = csvData;
  const errors = [];
  const warnings = [];

  // 1. Structure validation
  if (!data || data.length === 0) {
    errors.push('No data rows found');
    return { valid: false, errors, warnings };
  }

  // 2. Find financial columns
  const revenueColIndex = headers.findIndex(h => 
    h.toLowerCase().includes('revenue') || h.toLowerCase().includes('sales')
  );
  
  const spendColIndex = headers.findIndex(h => 
    h.toLowerCase().includes('spend') || h.toLowerCase().includes('cost')
  );

  // 3. Calculate EXACT totals with validation
  let totalRevenue = 0;
  let totalSpend = 0;
  
  if (revenueColIndex !== -1) {
    const revenueValues = data.map(row => {
      const val = parseFloat(row[revenueColIndex]);
      if (isNaN(val)) {
        warnings.push(`Invalid revenue value in row: ${row[revenueColIndex]}`);
        return 0;
      }
      if (val < 0) {
        warnings.push(`Negative revenue detected: ${val}`);
      }
      return val;
    });
    
    totalRevenue = revenueValues.reduce((sum, val) => sum + val, 0);
    
    console.log('✅ Revenue Calculation:', {
      values: revenueValues,
      total: totalRevenue,
      avg: totalRevenue / data.length
    });
  }
  
  if (spendColIndex !== -1) {
    const spendValues = data.map(row => {
      const val = parseFloat(row[spendColIndex]);
      return isNaN(val) ? 0 : val;
    });
    totalSpend = spendValues.reduce((sum, val) => sum + val, 0);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validated: {
      totalRevenue: totalRevenue,
      avgRevenue: data.length > 0 ? totalRevenue / data.length : 0,
      totalSpend: totalSpend,
      avgSpend: data.length > 0 ? totalSpend / data.length : 0,
      rowCount: data.length,
      revenueColumn: revenueColIndex !== -1 ? headers[revenueColIndex] : null,
      spendColumn: spendColIndex !== -1 ? headers[spendColIndex] : null
    }
  };
};

/**
 * Check if growth calculation is valid
 */
const canCalculateGrowth = (csvData) => {
  const { headers, data } = csvData;
  
  const hasDateColumn = headers.some(h => 
    h.toLowerCase().includes('date') || 
    h.toLowerCase().includes('month') ||
    h.toLowerCase().includes('week') ||
    h.toLowerCase().includes('year')
  );

  if (!hasDateColumn) {
    return {
      allowed: false,
      reason: 'No date/time column found. Growth rate requires time-series data.'
    };
  }

  if (data.length < 2) {
    return {
      allowed: false,
      reason: `Need at least 2 time periods (have ${data.length})`
    };
  }

  return { allowed: true };
};

/**
 * Check if statistical analysis is valid
 */
const canPerformStatistics = (csvData) => {
  const { data } = csvData;
  
  if (data.length < 30) {
    return {
      allowed: false,
      reason: `Sample size too small (${data.length} rows). Need ≥30 for statistical significance.`,
      sampleSize: data.length
    };
  }

  return {
    allowed: true,
    sampleSize: data.length
  };
};

/**
 * Check if forecasting is valid
 */
const canForecast = (csvData) => {
  const { headers, data } = csvData;
  
  const hasDateColumn = headers.some(h => 
    h.toLowerCase().includes('date') || h.toLowerCase().includes('month')
  );

  if (!hasDateColumn) {
    return {
      allowed: false,
      reason: 'Forecasting requires date/time column'
    };
  }

  if (data.length < 12) {
    return {
      allowed: false,
      reason: `Need ≥12 time periods for forecasting (have ${data.length})`
    };
  }

  return { allowed: true };
};

module.exports = {
  validateDataIntegrity,
  canCalculateGrowth,
  canPerformStatistics,
  canForecast
};
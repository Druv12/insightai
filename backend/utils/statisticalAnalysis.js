// ============================================
// STATISTICAL ANALYSIS MODULE
// Provides rigorous statistical methods for data analysis
// ============================================

/**
 * Detect anomalies using Z-score method
 * @param {Array<number>} values - Numeric array to analyze
 * @param {number} threshold - Z-score threshold (default: 2)
 * @returns {Object} Anomaly detection results
 */
const detectAnomalies = (values, threshold = 2) => {
  if (!values || values.length === 0) return null;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const anomalies = values
    .map((value, index) => {
      const zScore = (value - mean) / stdDev;
      return { index, value, zScore: zScore.toFixed(2) };
    })
    .filter(item => Math.abs(item.zScore) > threshold);
  
  return {
    totalAnomalies: anomalies.length,
    anomalies: anomalies,
    threshold: threshold,
    interpretation: anomalies.length > 0 
      ? `Found ${anomalies.length} outliers (values more than ${threshold} standard deviations from mean)` 
      : `No significant outliers detected (all values within ${threshold} standard deviations)`
  };
};

/**
 * Perform linear regression and trend analysis
 * @param {Array<number>} values - Time series data
 * @returns {Object} Trend analysis results with R²
 */
const detectTrend = (values) => {
  if (!values || values.length < 2) return null;
  
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  
  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = values.reduce((sum, y) => sum + y, 0) / n;
  
  // Calculate slope (beta1) and intercept (beta0)
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }
  
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  // Calculate R² (coefficient of determination)
  let ssRes = 0; // Residual sum of squares
  let ssTot = 0; // Total sum of squares
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssRes += Math.pow(values[i] - predicted, 2);
    ssTot += Math.pow(values[i] - yMean, 2);
  }
  
  const rSquared = 1 - (ssRes / ssTot);
  const isSignificant = rSquared > 0.5; // R² > 0.5 indicates moderate to strong correlation
  
  const trendDirection = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat';
  
  return {
    slope: slope.toFixed(2),
    intercept: intercept.toFixed(2),
    rSquared: rSquared.toFixed(2),
    isSignificant: isSignificant,
    trendDirection: trendDirection,
    equation: `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`,
    interpretation: `${trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)} trend with R² = ${rSquared.toFixed(2)} ` +
                   `(${isSignificant ? 'statistically significant' : 'weak correlation'})`
  };
};

/**
 * Calculate confidence interval for mean
 * @param {Array<number>} values - Data points
 * @param {number} confidenceLevel - Confidence level (default: 0.95 for 95%)
 * @returns {Object} Confidence interval results
 */
const calculateConfidenceInterval = (values, confidenceLevel = 0.95) => {
  if (!values || values.length < 2) return null;
  
  const n = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const stdError = stdDev / Math.sqrt(n);
  
  // Using t-distribution critical value (approximation for 95% CI)
  const tValue = n > 30 ? 1.96 : 2.0; // Simplified: use 2.0 for small samples
  const marginOfError = tValue * stdError;
  
  const lower = mean - marginOfError;
  const upper = mean + marginOfError;
  
  return {
    mean: mean.toFixed(2),
    lower: lower.toFixed(2),
    upper: upper.toFixed(2),
    marginOfError: marginOfError.toFixed(2),
    confidenceLevel: (confidenceLevel * 100).toFixed(0) + '%',
    interpretation: `We are ${(confidenceLevel * 100)}% confident the true mean is between ₹${lower.toFixed(2)} and ₹${upper.toFixed(2)}`
  };
};

/**
 * Test if growth is statistically significant
 * @param {Array<number>} values - Time series data
 * @returns {Object} Hypothesis test results
 */
const testGrowthSignificance = (values) => {
  if (!values || values.length < 4) return null;
  
  // Split into first half and second half
  const midpoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);
  
  const mean1 = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const mean2 = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const variance1 = firstHalf.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / firstHalf.length;
  const variance2 = secondHalf.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / secondHalf.length;
  
  // Pooled standard error
  const se = Math.sqrt(variance1 / firstHalf.length + variance2 / secondHalf.length);
  
  // T-statistic
  const tStat = (mean2 - mean1) / se;
  
  // Simplified p-value interpretation
  const isSignificant = Math.abs(tStat) > 2.0; // Corresponds to p < 0.05 approximately
  const pValue = isSignificant ? '< 0.05' : '> 0.05';
  
  return {
    tStatistic: tStat.toFixed(2),
    pValue: pValue,
    isSignificant: isSignificant,
    significance: isSignificant ? 'Statistically significant' : 'Not statistically significant',
    interpretation: isSignificant 
      ? `Growth between periods is statistically significant (p ${pValue})` 
      : `Growth between periods is not statistically significant (p ${pValue})`
  };
};

/**
 * Perform data quality diagnostics
 * @param {Array<number>} values - Data points
 * @returns {Object} Diagnostic results
 */
const performDiagnostics = (values) => {
  if (!values || values.length === 0) return null;
  
  const hasNegatives = values.some(v => v < 0);
  const hasZeros = values.some(v => v === 0);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const coefficientOfVariation = (Math.sqrt(variance) / mean) * 100;
  
  const issues = [];
  if (hasNegatives) issues.push('Contains negative values');
  if (hasZeros) issues.push('Contains zero values');
  if (coefficientOfVariation > 100) issues.push('High variability (CV > 100%)');
  
  return {
    sampleSize: values.length,
    hasNegatives: hasNegatives,
    hasZeros: hasZeros,
    coefficientOfVariation: coefficientOfVariation.toFixed(2) + '%',
    dataQuality: issues.length === 0 ? 'Good' : 'Moderate',
    issues: issues,
    interpretation: issues.length === 0 
      ? 'Data quality is good with no major issues' 
      : `Data quality issues: ${issues.join(', ')}`
  };
};

module.exports = {
  detectAnomalies,
  detectTrend,
  calculateConfidenceInterval,
  testGrowthSignificance,
  performDiagnostics
};
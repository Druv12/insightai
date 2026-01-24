

/**
 * Validates statistical confidence based on sample size
 * Prevents overconfident claims with small datasets
 */

const getStatisticalConfidence = (sampleSize) => {
  if (sampleSize < 10) {
    return {
      level: 'insufficient',
      description: 'Very limited data - trends may not be reliable',
      disclaimerPrefix: 'Analysis of ' + sampleSize + ' data points suggests',
      confidencePercent: 0,
      shouldShowRSquared: false,
      languageGuideline: 'Use cautious language like "appears to", "suggests", "indicates a pattern"'
    };
  } else if (sampleSize < 30) {
    return {
      level: 'low',
      description: 'Limited data - patterns observed but not statistically validated',
      disclaimerPrefix: 'Based on ' + sampleSize + ' data points',
      confidencePercent: 60,
      shouldShowRSquared: false,
      languageGuideline: 'Use moderate language like "shows a trend", "demonstrates a pattern"'
    };
  } else if (sampleSize < 100) {
    return {
      level: 'moderate',
      description: 'Reasonable sample size - trends are meaningful',
      disclaimerPrefix: 'Analysis of ' + sampleSize + ' data points',
      confidencePercent: 75,
      shouldShowRSquared: true,
      languageGuideline: 'Can use stronger language but mention sample size'
    };
  } else if (sampleSize < 500) {
    return {
      level: 'good',
      description: 'Good sample size - statistical patterns are reliable',
      disclaimerPrefix: 'Based on ' + sampleSize + ' data points',
      confidencePercent: 85,
      shouldShowRSquared: true,
      languageGuideline: 'Use confident language with statistical backing'
    };
  } else {
    return {
      level: 'high',
      description: 'Large sample size - high statistical confidence',
      disclaimerPrefix: 'Analysis of ' + sampleSize.toLocaleString() + ' data points',
      confidencePercent: 95,
      shouldShowRSquared: true,
      languageGuideline: 'Full confidence in statistical conclusions'
    };
  }
};

const buildStatisticalPromptAddition = (sampleSize, metrics) => {
  const confidence = getStatisticalConfidence(sampleSize);
  
  let promptAddition = `\n\n📊 STATISTICAL CONTEXT (CRITICAL):\n`;
  promptAddition += `- Sample Size: ${sampleSize} data points\n`;
  promptAddition += `- Statistical Confidence: ${confidence.level.toUpperCase()}\n`;
  promptAddition += `- Guidance: ${confidence.languageGuideline}\n`;
  
  if (sampleSize < 30) {
    promptAddition += `\n⚠️ IMPORTANT: With only ${sampleSize} data points, you MUST:\n`;
    promptAddition += `1. Start insights with "${confidence.disclaimerPrefix}"\n`;
    promptAddition += `2. Use cautious language (avoid "proves", "confirms", "statistically significant")\n`;
    promptAddition += `3. Add disclaimer: "Note: Limited sample size - validate with more data before major decisions"\n`;
    promptAddition += `4. Do NOT claim statistical significance or high confidence\n`;
  } else if (sampleSize < 100) {
    promptAddition += `\n📌 Note: ${confidence.disclaimerPrefix}, patterns are meaningful but should be validated with more data for critical decisions.\n`;
  }
  
  if (!confidence.shouldShowRSquared) {
    promptAddition += `5. Do NOT mention R² or p-values (insufficient data for these metrics)\n`;
  }
  
  return promptAddition;
};

module.exports = { getStatisticalConfidence, buildStatisticalPromptAddition };
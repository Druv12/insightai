/**
 * Universal Schema-Aware Analysis Engine
 * Works with ANY industry by analyzing column patterns
 */

const detectAvailableMetrics = (headers) => {
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[_\s]/g, ''));
  
  return {
    // Financial metrics
    hasRevenue: lowerHeaders.some(h => 
      h.includes('revenue') || h.includes('amount') || h.includes('sales') || 
      h.includes('price') || h.includes('income') || h.includes('earnings')
    ),
    hasCost: lowerHeaders.some(h => 
      h.includes('cost') || h.includes('expense') || h.includes('spending')
    ),
    hasProfit: lowerHeaders.some(h => 
      h.includes('profit') || h.includes('margin') || h.includes('ebitda')
    ),
    
    // User/Customer metrics
    hasUsers: lowerHeaders.some(h => 
      h.includes('user') || h.includes('customer') || h.includes('subscriber') || 
      h.includes('member') || h.includes('account') || h.includes('client')
    ),
    hasMAU: lowerHeaders.some(h => 
      h.includes('mau') || h.includes('monthlyactiveuser')
    ),
    hasDAU: lowerHeaders.some(h => 
      h.includes('dau') || h.includes('dailyactiveuser')
    ),
    
    // Engagement metrics
    hasRetention: lowerHeaders.some(h => 
      h.includes('retention') || h.includes('churn')
    ),
    hasEngagement: lowerHeaders.some(h => 
      h.includes('engagement') || h.includes('session') || h.includes('activity')
    ),
    
    // Transaction/Order metrics
    hasTransactions: lowerHeaders.some(h => 
      h.includes('transaction') || h.includes('order') || h.includes('purchase') || 
      h.includes('payment') || h.includes('sale')
    ),
    hasQuantity: lowerHeaders.some(h => 
      h.includes('quantity') || h.includes('volume') || h.includes('count') || 
      h.includes('units')
    ),
    
    // Growth metrics
    hasGrowth: lowerHeaders.some(h => 
      h.includes('growth') || h.includes('increase') || h.includes('rate')
    ),
    
    // Time-based
    hasDate: lowerHeaders.some(h => 
      h.includes('date') || h.includes('time') || h.includes('month') || 
      h.includes('quarter') || h.includes('year') || h.includes('week')
    ),
    
    // Location
    hasLocation: lowerHeaders.some(h => 
      h.includes('country') || h.includes('region') || h.includes('city') || 
      h.includes('location') || h.includes('geography')
    ),
    
    // Product/Category
    hasProduct: lowerHeaders.some(h => 
      h.includes('product') || h.includes('item') || h.includes('category') || 
      h.includes('service') || h.includes('sku')
    ),
    
    // Performance metrics
    hasConversion: lowerHeaders.some(h => 
      h.includes('conversion') || h.includes('rate')
    ),
    
    // Store raw headers for custom analysis
    rawHeaders: headers,
    lowerHeaders: lowerHeaders
  };
};

/**
 * Universal Industry Detection
 * Analyzes column patterns to intelligently detect ANY industry
 */
const detectIndustryType = (availableColumns) => {
  const { lowerHeaders } = availableColumns;
  
  // Score-based detection system
  const industryScores = {
    fintech: 0,
    saas: 0,
    ecommerce: 0,
    healthcare: 0,
    logistics: 0,
    manufacturing: 0,
    retail: 0,
    education: 0,
    realestate: 0,
    hospitality: 0,
    media: 0,
    telecom: 0,
    energy: 0,
    generic: 0
  };
  
  // FinTech indicators
  const fintechTerms = ['transaction', 'payment', 'wallet', 'balance', 'transfer', 'loan', 'credit', 'debit', 'card', 'bank', 'arpu', 'aum', 'tnx'];
  fintechTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.fintech += 2;
  });
  
  // SaaS indicators
  const saasTerms = ['mrr', 'arr', 'churn', 'ltv', 'cac', 'subscription', 'plan', 'tier', 'license', 'user', 'mau', 'dau', 'retention'];
  saasTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.saas += 2;
  });
  
  // E-commerce indicators
  const ecommerceTerms = ['cart', 'checkout', 'order', 'shipping', 'delivery', 'product', 'inventory', 'sku', 'basket', 'purchase'];
  ecommerceTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.ecommerce += 2;
  });
  
  // Healthcare indicators
  const healthcareTerms = ['patient', 'doctor', 'appointment', 'diagnosis', 'treatment', 'prescription', 'hospital', 'clinic', 'medical', 'health'];
  healthcareTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.healthcare += 2;
  });
  
  // Logistics indicators
  const logisticsTerms = ['shipment', 'delivery', 'carrier', 'tracking', 'freight', 'warehouse', 'dispatch', 'route', 'driver', 'vehicle'];
  logisticsTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.logistics += 2;
  });
  
  // Manufacturing indicators
  const manufacturingTerms = ['production', 'yield', 'defect', 'quality', 'assembly', 'machine', 'downtime', 'throughput', 'batch', 'plant'];
  manufacturingTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.manufacturing += 2;
  });
  
  // Retail indicators
  const retailTerms = ['store', 'branch', 'pos', 'cashier', 'footfall', 'traffic', 'basket', 'merchandise', 'inventory', 'stock'];
  retailTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.retail += 2;
  });
  
  // Education indicators
  const educationTerms = ['student', 'course', 'enrollment', 'grade', 'teacher', 'class', 'exam', 'tuition', 'campus', 'learning'];
  educationTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.education += 2;
  });
  
  // Real Estate indicators
  const realestateTerms = ['property', 'listing', 'rent', 'lease', 'tenant', 'mortgage', 'sqft', 'bedroom', 'apartment', 'house'];
  realestateTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.realestate += 2;
  });
  
  // Hospitality indicators
  const hospitalityTerms = ['booking', 'reservation', 'guest', 'room', 'occupancy', 'checkin', 'checkout', 'hotel', 'restaurant', 'travel'];
  hospitalityTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.hospitality += 2;
  });
  
  // Media/Entertainment indicators
  const mediaTerms = ['view', 'impression', 'click', 'engagement', 'content', 'video', 'article', 'stream', 'watch', 'listen'];
  mediaTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.media += 2;
  });
  
  // Telecom indicators
  const telecomTerms = ['call', 'sms', 'data', 'network', 'tower', 'subscriber', 'voice', 'roaming', 'minutes', 'bandwidth'];
  telecomTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.telecom += 2;
  });
  
  // Energy indicators
  const energyTerms = ['power', 'electricity', 'consumption', 'kwh', 'meter', 'grid', 'generation', 'solar', 'wind', 'fuel'];
  energyTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.energy += 2;
  });
  
  // Generic business terms (lower score)
  const genericTerms = ['revenue', 'sales', 'customer', 'date', 'amount', 'total', 'count', 'id'];
  genericTerms.forEach(term => {
    if (lowerHeaders.some(h => h.includes(term))) industryScores.generic += 1;
  });
  
  // Find the industry with highest score
  let detectedIndustry = 'business';
  let maxScore = 0;
  
  Object.entries(industryScores).forEach(([industry, score]) => {
    if (score > maxScore && score > 3) { // Require meaningful score (at least 2 matching terms)
      maxScore = score;
      detectedIndustry = industry;
    }
  });
  
  // If only generic terms matched, return 'business'
  if (detectedIndustry === 'generic' || maxScore <= 3) {
    detectedIndustry = 'business';
  }
  
  console.log('🎯 Industry Detection Scores:', industryScores);
  console.log('✅ Detected Industry:', detectedIndustry);
  
  return detectedIndustry;
};

/**
 * Generate industry-specific metrics based on available columns
 * This adapts to ANY dataset by analyzing what's actually present
 */
const generateIndustryMetrics = (csvData, industryType, availableColumns) => {
  const metrics = {};
  const { headers } = csvData;
  
  // Helper: Find columns matching a pattern
  const findColumn = (patterns) => {
    const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[_\s]/g, ''));
    for (let pattern of patterns) {
      const index = lowerHeaders.findIndex(h => h.includes(pattern));
      if (index !== -1) return headers[index];
    }
    return null;
  };
  
  // Helper: Calculate sum safely
  const calculateSum = (columnName) => {
    if (!columnName) return 0;
    const colIndex = headers.indexOf(columnName);
    if (colIndex === -1) return 0;
    
    return csvData.data.reduce((sum, row) => {
      const value = parseFloat(row[colIndex]);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };
  
  // Helper: Calculate average safely
  const calculateAverage = (columnName) => {
    if (!columnName) return 0;
    const sum = calculateSum(columnName);
    return csvData.data.length > 0 ? sum / csvData.data.length : 0;
  };
  
  // Universal metrics (work for any dataset)
  const revenueCol = findColumn(['revenue', 'sales', 'amount', 'income', 'earnings']);
  const costCol = findColumn(['cost', 'expense', 'spending', 'cogs']);
  const quantityCol = findColumn(['quantity', 'volume', 'count', 'units', 'transactions', 'orders']);
  const userCol = findColumn(['user', 'customer', 'subscriber', 'member', 'account']);
  
  if (revenueCol) {
    metrics['Total Revenue'] = calculateSum(revenueCol).toFixed(2);
    metrics['Average Revenue'] = calculateAverage(revenueCol).toFixed(2);
  }
  
  if (costCol) {
    metrics['Total Cost'] = calculateSum(costCol).toFixed(2);
  }
  
  if (revenueCol && costCol) {
    const totalRevenue = calculateSum(revenueCol);
    const totalCost = calculateSum(costCol);
    metrics['Gross Profit'] = (totalRevenue - totalCost).toFixed(2);
    metrics['Profit Margin %'] = ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(2);
  }
  
  if (quantityCol) {
    metrics['Total Volume'] = calculateSum(quantityCol).toFixed(0);
    metrics['Average Volume'] = calculateAverage(quantityCol).toFixed(2);
  }
  
  if (userCol) {
    metrics['Total Users/Customers'] = calculateSum(userCol).toFixed(0);
    metrics['Average Users/Customers'] = calculateAverage(userCol).toFixed(2);
  }
  
  // Add industry-specific context
  metrics['Detected Industry'] = industryType.charAt(0).toUpperCase() + industryType.slice(1);
  metrics['Data Points'] = csvData.data.length;
  metrics['Columns Analyzed'] = headers.length;
  
  return metrics;
};

module.exports = {
  detectAvailableMetrics,
  detectIndustryType,
  generateIndustryMetrics
};
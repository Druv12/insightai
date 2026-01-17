<<<<<<< HEAD
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
    return csvData.data.reduce((sum, row) => {
      const value = parseFloat(row[columnName]);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };
  
  // Helper: Calculate average safely
  const calculateAverage = (columnName) => {
    if (!columnName) return 0;
    const sum = calculateSum(columnName);
    return sum / csvData.data.length;
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
=======
// backend/utils/schemaAwareAnalysis.js

const detectAvailableMetrics = (headers) => {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  return {
    hasRevenue: lowerHeaders.some(h => h.includes('revenue') || h.includes('amount') || h.includes('sales') || h.includes('price') || h.includes('net_amount')),
    revenueColumn: headers.find((h, i) => lowerHeaders[i].includes('revenue') || lowerHeaders[i].includes('amount') || lowerHeaders[i].includes('sales') || lowerHeaders[i].includes('price') || lowerHeaders[i].includes('net_amount')),
    hasUserID: lowerHeaders.some(h => h.includes('user') && (h.includes('id') || h === 'user')),
    userColumn: headers.find((h, i) => lowerHeaders[i].includes('user') && (lowerHeaders[i].includes('id') || lowerHeaders[i] === 'user')),
    hasQuantity: lowerHeaders.some(h => h.includes('quantity') || h.includes('units') || h.includes('count')),
    quantityColumn: headers.find((h, i) => lowerHeaders[i].includes('quantity') || lowerHeaders[i].includes('units')),
    hasDate: lowerHeaders.some(h => h.includes('date') || h.includes('month') || h.includes('year') || h.includes('time') || h.includes('transaction_date')),
    dateColumn: headers.find((h, i) => lowerHeaders[i].includes('date') || lowerHeaders[i].includes('month') || lowerHeaders[i].includes('transaction_date')),
    hasProduct: lowerHeaders.some(h => h.includes('product') || h.includes('item') || h.includes('sku')),
    productColumn: headers.find((h, i) => lowerHeaders[i].includes('product')),
    hasMAU: lowerHeaders.some(h => h === 'mau' || h.includes('monthly_active')),
    hasRetention: lowerHeaders.some(h => h.includes('retention')),
    hasChannel: lowerHeaders.some(h => h.includes('channel') || h.includes('source')),
    channelColumn: headers.find((h, i) => lowerHeaders[i].includes('channel') || lowerHeaders[i].includes('source')),
    hasCountry: lowerHeaders.some(h => h.includes('country') || h.includes('region')),
    hasCity: lowerHeaders.some(h => h.includes('city') || h.includes('location'))
  };
};

const calculateSchemaAwareMetrics = (csvData) => {
  const { headers, data } = csvData;
  const available = detectAvailableMetrics(headers);
  const metrics = {};
  
  console.log('🔍 Schema Detection:', { totalColumns: headers.length, availableMetrics: Object.keys(available).filter(k => available[k] === true).length });
  
  if (available.hasRevenue) {
    const revenueIndex = headers.indexOf(available.revenueColumn);
    const revenues = data.map(row => parseFloat(row[revenueIndex]) || 0);
    metrics.totalRevenue = revenues.reduce((sum, val) => sum + val, 0);
    metrics.avgRevenue = metrics.totalRevenue / revenues.length;
    metrics.maxRevenue = Math.max(...revenues);
    metrics.minRevenue = Math.min(...revenues.filter(r => r > 0));
    console.log(`✅ Revenue metrics calculated from column: ${available.revenueColumn}`);
  } else {
    console.log('❌ No revenue column detected');
  }
  
  if (available.hasQuantity) {
    const quantityIndex = headers.indexOf(available.quantityColumn);
    const quantities = data.map(row => parseFloat(row[quantityIndex]) || 0);
    metrics.totalQuantity = quantities.reduce((sum, val) => sum + val, 0);
    metrics.avgQuantity = metrics.totalQuantity / quantities.length;
    console.log(`✅ Quantity metrics calculated`);
  }
  
  if (available.hasUserID) {
    const userIndex = headers.indexOf(available.userColumn);
    const uniqueUsers = new Set(data.map(row => row[userIndex]));
    metrics.uniqueUsers = uniqueUsers.size;
    metrics.transactionsPerUser = data.length / uniqueUsers.size;
    
    if (available.hasRevenue) {
      metrics.arpu = metrics.totalRevenue / uniqueUsers.size;
      console.log(`✅ ARPU calculated: ₹${metrics.arpu.toLocaleString()}`);
    }
    console.log(`✅ User metrics: ${uniqueUsers.size} unique users`);
  } else {
    console.log('❌ No user_id column - skipping user metrics');
  }
  
  if (available.hasDate && available.hasRevenue) {
    const dateIndex = headers.indexOf(available.dateColumn);
    const revenueIndex = headers.indexOf(available.revenueColumn);
    const periodRevenue = {};
    data.forEach(row => {
      const period = row[dateIndex];
      if (!periodRevenue[period]) periodRevenue[period] = 0;
      periodRevenue[period] += parseFloat(row[revenueIndex]) || 0;
    });
    const periods = Object.keys(periodRevenue).sort();
    if (periods.length >= 2) {
      const firstRevenue = periodRevenue[periods[0]];
      const lastRevenue = periodRevenue[periods[periods.length - 1]];
      if (firstRevenue > 0) {
        metrics.growthRate = ((lastRevenue - firstRevenue) / firstRevenue) * 100;
        console.log(`✅ Growth rate: ${metrics.growthRate.toFixed(2)}%`);
      }
    }
    metrics.periodBreakdown = periodRevenue;
  }
  
  if (available.hasChannel && available.hasRevenue) {
    const channelIndex = headers.indexOf(available.channelColumn);
    const revenueIndex = headers.indexOf(available.revenueColumn);
    const channelRevenue = {};
    data.forEach(row => {
      const channel = row[channelIndex];
      if (!channelRevenue[channel]) channelRevenue[channel] = 0;
      channelRevenue[channel] += parseFloat(row[revenueIndex]) || 0;
    });
    metrics.channelBreakdown = channelRevenue;
    console.log(`✅ Channel breakdown calculated`);
  }
  
  if (available.hasProduct && available.hasRevenue) {
    const productIndex = headers.indexOf(available.productColumn);
    const revenueIndex = headers.indexOf(available.revenueColumn);
    const productRevenue = {};
    data.forEach(row => {
      const product = row[productIndex];
      if (!productRevenue[product]) productRevenue[product] = 0;
      productRevenue[product] += parseFloat(row[revenueIndex]) || 0;
    });
    metrics.topProducts = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([product, revenue]) => ({ product, revenue }));
    console.log(`✅ Product analysis complete`);
  }
  
  return { metrics, availableColumns: available };
};

const generateSchemaAwareInsightPrompt = (csvData, metrics, availableColumns, question) => {
  const { headers, data } = csvData;
  let dataContext = `
📊 AVAILABLE DATA:
Rows: ${data.length.toLocaleString()}
Columns: ${headers.join(', ')}

✅ AVAILABLE METRICS:
`;
  if (metrics.totalRevenue !== undefined) dataContext += `- Total Revenue: ₹${metrics.totalRevenue.toLocaleString()}\n`;
  if (metrics.totalQuantity !== undefined) dataContext += `- Total Quantity: ${metrics.totalQuantity.toLocaleString()}\n`;
  if (metrics.uniqueUsers !== undefined) dataContext += `- Unique Users: ${metrics.uniqueUsers.toLocaleString()}\n`;
  if (metrics.arpu !== undefined) dataContext += `- ARPU: ₹${metrics.arpu.toLocaleString()}\n`;
  if (metrics.growthRate !== undefined) dataContext += `- Growth Rate: ${metrics.growthRate.toFixed(2)}%\n`;
  
  dataContext += `\n❌ UNAVAILABLE:\n`;
  if (!availableColumns.hasUserID) dataContext += `- User metrics (no user_id)\n`;
  if (!availableColumns.hasMAU) dataContext += `- MAU (no MAU column)\n`;
  
  dataContext += `\nSample:\n${headers.join(' | ')}\n${data.slice(0, 10).map(row => row.join(' | ')).join('\n')}`;
  return dataContext;
};

module.exports = { detectAvailableMetrics, calculateSchemaAwareMetrics, generateSchemaAwareInsightPrompt };
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2

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
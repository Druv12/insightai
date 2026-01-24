// ============================================
// COMPLETE FIXED /api/analyze ENDPOINT
// Replace your existing endpoint with this
// ============================================

app.post('/api/analyze', verifyToken, async (req, res) => {
  console.log('📊 [ANALYZE] ==================== NEW ANALYSIS REQUEST ====================');

  try {
    const { question, csvData, datasetId } = req.body;

    console.log('📊 [ANALYZE] User:', req.user.email);
    console.log('📊 [ANALYZE] Question:', question?.substring(0, 100) + '...');
    console.log('📊 [ANALYZE] CSV Data present:', !!csvData);
    console.log('📊 [ANALYZE] Dataset ID:', datasetId || 'none');

    if (!question || !csvData) {
      console.error('❌ [ANALYZE] Missing required data');
      return res.status(400).json({ success: false, error: 'Missing data' });
    }

    const rowCount = csvData.data.length;

    // ============================================
    // 🚨 PRODUCTION VALIDATION - CRITICAL
    // ============================================
    console.log('🔍 Running production validation...');

    const dataValidation = validateDataIntegrity(csvData);

    if (!dataValidation.valid) {
      console.error('❌ Data validation failed:', dataValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Data validation failed: ' + dataValidation.errors.join(', '),
        details: dataValidation.errors
      });
    }

    // Check metric eligibility
    const growthCheck = canCalculateGrowth(csvData);
    const statsCheck = canPerformStatistics(csvData);
    const forecastCheck = canForecast(csvData);

    console.log('✅ Validated Totals:', {
      revenue: dataValidation.validated.totalRevenue,
      spend: dataValidation.validated.totalSpend,
      rows: dataValidation.validated.rowCount
    });

    console.log('📊 Metric Eligibility:', {
      growth: growthCheck.allowed,
      statistics: statsCheck.allowed,
      forecasting: forecastCheck.allowed
    });

    // Store validated totals for AI prompt
    const VALIDATED_TOTALS = {
      totalRevenue: dataValidation.validated.totalRevenue,
      avgRevenue: dataValidation.validated.avgRevenue,
      totalSpend: dataValidation.validated.totalSpend,
      rowCount: dataValidation.validated.rowCount
    };

    // ============================================
    // Calculate Schema-Aware Industry Metrics
    // ============================================
    const availableColumns = detectAvailableMetrics(csvData.headers);
    const industryType = detectIndustryType(availableColumns);
    const schemaMetrics = generateIndustryMetrics(csvData, industryType, availableColumns);

    console.log('🎯 Detected Industry:', industryType);
    console.log('📊 Schema-Aware Metrics:', schemaMetrics);

    // Generate column mapping to prevent "undefined" in SQL
    const columnMap = mapColumnNames(csvData);
    console.log('🗺️ Column Mapping:', columnMap);

    // Generate SQL with validated column names
    const sqlQueries = generateValidatedSQL(csvData, schemaMetrics, availableColumns);
    console.log('🗄️ SQL Queries Generated:', sqlQueries.length);

    // ============================================
    // CONDITIONAL STATISTICAL ANALYSIS
    // ============================================
    let statisticalResults = null;

    if (statsCheck.allowed) {
      console.log('📊 Sample size adequate - running statistical analysis...');

      // Detect numeric columns for analysis
      const numericColumns = csvData.headers.map((header, index) => {
        const values = csvData.data.map(row => {
          const val = parseFloat(row[index]);
          return isNaN(val) ? null : val;
        }).filter(v => v !== null);
        
        return values.length > 0 ? { header, index, values } : null;
      }).filter(Boolean);

      if (numericColumns.length > 0) {
        const primaryColumn = numericColumns[0];

        // Calculate basic statistics
        const mean = primaryColumn.values.reduce((a, b) => a + b, 0) / primaryColumn.values.length;
        const sortedValues = [...primaryColumn.values].sort((a, b) => a - b);
        const median = sortedValues[Math.floor(sortedValues.length / 2)];
        
        statisticalResults = {
          columnName: primaryColumn.header,
          sampleSize: primaryColumn.values.length,
          mean: mean,
          median: median,
          min: Math.min(...primaryColumn.values),
          max: Math.max(...primaryColumn.values),
          total: primaryColumn.values.reduce((a, b) => a + b, 0)
        };

        console.log('✅ Statistical analysis complete:', statisticalResults);
      }
    } else {
      console.log('⚠️ Statistical analysis DISABLED:', statsCheck.reason);
      statisticalResults = {
        disabled: true,
        reason: statsCheck.reason,
        sampleSize: rowCount
      };
    }

    // ============================================
    // PREPARE DATA FOR AI
    // ============================================
    let dataContext = '';
    let sampleData = '';

    if (rowCount > 100) {
      console.log(`📊 Large dataset (${rowCount} rows) - using aggregation`);
      
      // Get first 10 and last 5 rows for context
      const firstRows = csvData.data.slice(0, 10);
      const lastRows = csvData.data.slice(-5);
      
      sampleData = `
📋 Sample Data (First 10 rows):
${csvData.headers.join(' | ')}
${firstRows.map(row => row.join(' | ')).join('\n')}

... (${rowCount - 15} more rows) ...

📋 Recent Data (Last 5 rows):
${lastRows.map(row => row.join(' | ')).join('\n')}
`;
    } else {
      // Show all data for small datasets
      sampleData = `
📋 Complete Dataset (${rowCount} rows):
${csvData.headers.join(' | ')}
${csvData.data.map(row => row.join(' | ')).join('\n')}
`;
    }

    dataContext = `
📊 COMPREHENSIVE DATASET ANALYSIS
Total Rows Analyzed: ${rowCount.toLocaleString()}
Industry Detected: ${industryType}
Columns: ${csvData.headers.join(', ')}

💰 VALIDATED FINANCIAL METRICS (Calculated from actual data):
${VALIDATED_TOTALS.totalRevenue > 0 ? `Total Revenue: ₹${VALIDATED_TOTALS.totalRevenue.toLocaleString('en-IN')}` : ''}
${VALIDATED_TOTALS.avgRevenue > 0 ? `Average Revenue: ₹${VALIDATED_TOTALS.avgRevenue.toLocaleString('en-IN')}` : ''}
${VALIDATED_TOTALS.totalSpend > 0 ? `Total Spend: ₹${VALIDATED_TOTALS.totalSpend.toLocaleString('en-IN')}` : ''}
${VALIDATED_TOTALS.totalRevenue > 0 && VALIDATED_TOTALS.totalSpend > 0 ? `Profit: ₹${(VALIDATED_TOTALS.totalRevenue - VALIDATED_TOTALS.totalSpend).toLocaleString('en-IN')}` : ''}

${sampleData}

📊 Statistical Summary:
${statisticalResults && !statisticalResults.disabled ? `
- Sample Size: ${statisticalResults.sampleSize} data points
- Mean: ${statisticalResults.mean ? statisticalResults.mean.toFixed(2) : 'N/A'}
- Range: ${statisticalResults.min ? statisticalResults.min.toFixed(2) : 'N/A'} to ${statisticalResults.max ? statisticalResults.max.toFixed(2) : 'N/A'}
` : `- Limited sample size (${rowCount} rows) - showing trends only`}

⚠️ IMPORTANT CONSTRAINTS:
${!growthCheck.allowed ? `- Growth Rate: ${growthCheck.reason}` : ''}
${!statsCheck.allowed ? `- Statistical Tests: ${statsCheck.reason}` : ''}
${!forecastCheck.allowed ? `- Forecasting: ${forecastCheck.reason}` : ''}
`;

    // ============================================
    // BUILD AI SYSTEM PROMPT
    // ============================================
    const systemPrompt = `You are a professional data analyst for ${industryType} industry.

🎯 YOUR TASK:
Analyze the provided dataset and answer the user's question with clear, actionable insights.

📊 VALIDATED DATA (DO NOT RECALCULATE):
${VALIDATED_TOTALS.totalRevenue > 0 ? `Total Revenue: ₹${VALIDATED_TOTALS.totalRevenue.toLocaleString('en-IN')} (VERIFIED)` : ''}
${VALIDATED_TOTALS.avgRevenue > 0 ? `Average Revenue: ₹${VALIDATED_TOTALS.avgRevenue.toLocaleString('en-IN')} (VERIFIED)` : ''}
Sample Size: ${rowCount} data points

⚠️ CRITICAL RULES:
1. Use ONLY the validated totals shown above
2. ${rowCount < 30 ? 'With only ' + rowCount + ' data points, focus on observable trends rather than statistical significance' : 'Provide statistical insights'}
3. ${!growthCheck.allowed ? 'DO NOT calculate growth rates - ' + growthCheck.reason : 'Growth analysis is allowed'}
4. Be specific and actionable
5. If asked about totals, use the VERIFIED values above

📝 RESPONSE FORMAT:
- Start with key finding
- Provide 2-3 actionable insights
- Use bullet points for clarity
- Keep language business-friendly`;

    // ============================================
    // CALL GROQ AI
    // ============================================
    console.log('🤖 Calling GROQ AI...');

    const aiResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `${question}\n\n${dataContext}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error('❌ AI API Error:', errorData);
      throw new Error(`AI API Error: ${aiResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

    console.log('✅ AI Response received');
    console.log('📝 Response length:', answer.length, 'characters');

    // ============================================
    // SAVE TO DATABASE (if datasetId provided)
    // ============================================
    if (datasetId) {
      try {
        const analysis = new Analysis({
          userId: req.user.uid,
          datasetId: datasetId,
          question: question,
          answer: answer,
          industryType: industryType,
          dataMetrics: {
            rowCount: rowCount,
            columnCount: csvData.headers.length,
            totalRevenue: VALIDATED_TOTALS.totalRevenue,
            avgRevenue: VALIDATED_TOTALS.avgRevenue
          },
          timestamp: new Date()
        });

        await analysis.save();
        console.log('✅ Analysis saved to database');
      } catch (dbError) {
        console.error('⚠️ Failed to save analysis:', dbError.message);
        // Don't fail the request if DB save fails
      }
    }

    // ============================================
    // RETURN COMPLETE RESPONSE
    // ============================================
    res.json({
      success: true,
      type: 'text',
      content: answer,
      confidence: statsCheck.allowed ? 'high' : 'moderate',
      industryType: industryType,
      statistics: statisticalResults,
      availableColumns: availableColumns,
      sqlQueries: sqlQueries,
      validationFlags: {
        growthAllowed: growthCheck.allowed,
        growthReason: growthCheck.reason,
        statsAllowed: statsCheck.allowed,
        statsReason: statsCheck.reason,
        forecastAllowed: forecastCheck.allowed,
        forecastReason: forecastCheck.reason
      },
      validatedTotals: VALIDATED_TOTALS,
      dataQuality: {
        sampleSize: rowCount,
        hasRevenue: VALIDATED_TOTALS.totalRevenue > 0,
        hasSpend: VALIDATED_TOTALS.totalSpend > 0,
        validationWarnings: dataValidation.warnings
      }
    });

    console.log('✅ [ANALYZE] Request completed successfully');

  } catch (error) {
    console.error('❌ [ANALYZE] Error:', error);
    
    // Detailed error logging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    res.status(500).json({
      success: false,
      error: 'Analysis failed: ' + error.message,
      type: 'error'
    });
  }
});

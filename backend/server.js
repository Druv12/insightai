const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

require('dotenv').config();



const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Debug logs
console.log('🔑 GROQ_API_KEY:', GROQ_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('🔑 MONGODB_URI:', MONGODB_URI ? '✅ Loaded' : '❌ Missing');

// ============================================
// MONGODB CONNECTION
// ============================================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
// MONGODB SCHEMAS
// ============================================
const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  companyName: { type: String, default: 'My Company' },
  photoURL: String,
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

const datasetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  datasetName: { type: String, required: true },
  rawData: { type: String, required: true },
  parsedData: {
    headers: [String],
    data: [[mongoose.Schema.Types.Mixed]]
  },
  metadata: {
    rowCount: Number,
    totalRevenue: Number,
    dateRange: String,
    dataQuality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' }
  },
  uploadedAt: { type: Date, default: Date.now }
});

const analysisSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String },
  userName: { type: String },
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
  
  // Original data
  rawData: String,
  
  // Parsed CSV data
  csvData: {
    headers: [String],
    data: [[mongoose.Schema.Types.Mixed]]
  },
  
  // Analysis results
  analysis: {
    summary: String,
    metrics: {
      totalRevenue: Number,
      avgRevenue: Number,
      maxRevenue: Number,
      minRevenue: Number,
      totalQuantity: Number,
      growthRate: Number,
      dataPoints: Number
    }
  },
  
  // Questions asked
  questions: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Metadata
  dataType: {
    type: String,
    enum: ['sales', 'revenue', 'customer', 'inventory', 'other'],
    default: 'sales'
  },
  
  tags: [String],
  
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
analysisSchema.index({ userId: 1, timestamp: -1 });
analysisSchema.index({ userId: 1, dataType: 1 });


const User = mongoose.model('User', userSchema);
const Dataset = mongoose.model('Dataset', datasetSchema);
const Analysis = mongoose.model('Analysis', analysisSchema);

// ============================================
// FIREBASE AUTHENTICATION MIDDLEWARE
// ============================================
let admin;
try {
  admin = require('firebase-admin');
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('⚠️ Firebase Admin initialization failed:', error.message);
  console.log('🔓 Running in NO-AUTH mode for testing');
}

const verifyToken = async (req, res, next) => {
  try {
    // Skip auth in development if no Firebase
    if (!admin) {
      req.user = { uid: 'test-user', email: 'test@example.com', name: 'Test User' };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split('@')[0],
      picture: decodedToken.picture
    };
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

// ============================================
// DATA VALIDATION HELPER
// ============================================
function validateData(csvData) {
  const warnings = [];
  const rowCount = csvData.data.length;
  
  if (rowCount < 3) {
    warnings.push('⚠️ Very limited data (less than 3 rows). Analysis confidence will be low.');
  } else if (rowCount < 10) {
    warnings.push('⚠️ Small dataset. Consider adding more data for better insights.');
  }
  
  const revenueColIndex = csvData.headers.findIndex(h => 
    h.toLowerCase().includes('revenue') || h.toLowerCase().includes('amount')
  );
  
  if (revenueColIndex !== -1) {
    const hasNegative = csvData.data.some(row => row[revenueColIndex] < 0);
    if (hasNegative) {
      warnings.push('❌ Detected negative revenue values. Please verify data accuracy.');
    }
  }
  
  let totalRevenue = 0;
  if (revenueColIndex !== -1) {
    totalRevenue = csvData.data.reduce((sum, row) => {
      const value = parseFloat(row[revenueColIndex]) || 0;
      return sum + value;
    }, 0);
  }
  
  let confidence = 'medium';
  if (rowCount >= 50) confidence = 'high';
  else if (rowCount < 5) confidence = 'low';
  
  return { warnings, totalRevenue, confidence, rowCount };
}

// ============================================
// GROQ API HELPER
// ============================================
async function callGroqAPI(messages) {
  const response = await axios.post(GROQ_API_URL, {
    model: 'llama-3.3-70b-versatile',
    messages: messages,
    temperature: 0.7,
    max_tokens: 4000
  }, {
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
}

// ============================================
// ROUTES
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: '✅ healthy', 
    api: 'Groq (FREE)', 
    model: 'Llama 3.3 70B',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.post('/api/auth/login', verifyToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email: email,
        displayName: name,
        photoURL: picture
      });
      console.log('✅ New user created:', email);
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/parse-data', verifyToken, async (req, res) => {
  try {
    const { rawData } = req.body;
    if (!rawData?.trim()) {
      return res.status(400).json({ success: false, error: 'No data provided' });
    }

    console.log('📊 Parsing data for user:', req.user.email);
    
    const prompt = `Parse this data into CSV format. Return ONLY the CSV, no explanations.

DATA: ${rawData}

RULES:
- Extract dates, products, quantities, amounts
- First row: headers (Date,Product,Quantity,Revenue)
- Clean and standardize
- NO markdown, NO explanations

CSV:`;

    const csvText = await callGroqAPI([
      { role: 'system', content: 'Return ONLY CSV format, no explanations.' },
      { role: 'user', content: prompt }
    ]);

    let cleanedCSV = csvText.trim().replace(/```csv\n?/g, '').replace(/```/g, '');
    const lines = cleanedCSV.split('\n').filter(line => line.trim());
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => 
      line.split(',').map(cell => {
        const cleaned = cell.trim().replace(/"/g, '');
        const num = parseFloat(cleaned.replace(/[$,₹]/g, ''));
        return isNaN(num) ? cleaned : num;
      })
    );

    const csvData = { headers, data };
    const validation = validateData(csvData);
    
    const dataset = await Dataset.create({
      userId: req.user.uid,
      datasetName: `Dataset ${new Date().toLocaleDateString()}`,
      rawData: rawData,
      parsedData: csvData,
      metadata: {
        rowCount: validation.rowCount,
        totalRevenue: validation.totalRevenue,
        dataQuality: validation.confidence === 'high' ? 'excellent' : 
                     validation.confidence === 'medium' ? 'good' : 'fair'
      }
    });

    console.log(`✅ Parsed ${data.length} rows, saved to DB`);
    
    res.json({ 
      success: true, 
      csvData, 
      rowCount: data.length,
      validation,
      datasetId: dataset._id
    });
  } catch (error) {
    console.error('❌ Parse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze', verifyToken, async (req, res) => {
  try {
    const { question, csvData, datasetId } = req.body;
    if (!question || !csvData) {
      return res.status(400).json({ success: false, error: 'Missing data' });
    }

    console.log('🤖 Analyzing for:', req.user.email);
    
    const validation = validateData(csvData);
    
    const dataContext = `
Headers: ${csvData.headers.join(', ')}
Rows: ${csvData.data.length}
Total Revenue: ₹${validation.totalRevenue.toFixed(2)}
Data Quality: ${validation.confidence}

DATA PREVIEW:
${csvData.headers.join(' | ')}
${csvData.data.slice(0, 20).map(row => row.join(' | ')).join('\n')}

FULL DATA: ${JSON.stringify(csvData)}`;

    const confidenceNote = validation.confidence === 'low' 
      ? '\n⚠️ NOTE: Limited data available. Analysis confidence is LOW. Recommendations may need verification.'
      : validation.confidence === 'medium'
      ? '\n💡 NOTE: Moderate data volume. Analysis confidence is MEDIUM.'
      : '\n✅ NOTE: Good data volume. Analysis confidence is HIGH.';

    const prompt = `Analyze this dataset and answer: "${question}"

${dataContext}

${confidenceNote}

${validation.warnings.length > 0 ? 'DATA WARNINGS:\n' + validation.warnings.join('\n') : ''}

IMPORTANT: This response will be READ ALOUD by text-to-speech. Write it as a SPOKEN PRESENTATION.

When mentioning amounts in Indian Rupees:
- Write large numbers in Indian format for speech
- Example: ₹700000 should be written as "seven lakh rupees" or "₹7 lakhs"
- Example: ₹5000000 should be written as "fifty lakh rupees" or "₹50 lakhs"  
- Example: ₹10000000 should be written as "one crore rupees" or "₹1 crore"
- Example: ₹25000 should be written as "twenty-five thousand rupees" or "₹25 thousand"

Format guidelines:
- Write in flowing paragraphs, NOT bullet points
- Use natural spoken language like "As we can see", "Looking at the data", "What's interesting is"
- Mention ALL key numbers conversationally in Indian format
- Keep it professional but warm, like talking to a colleague

Provide:
1. Opening statement about what the data shows
2. Key findings with CORRECT calculations (mention ALL specific numbers naturally in lakhs/crores)
3. Supporting insights and patterns observed (with percentages and amounts)
4. Top 2-3 actionable recommendations
5. Closing remarks

CRITICAL: Don't skip any important metrics. Mention revenue, growth rate, quantities, and all key numbers in your analysis.

Use emojis sparingly: 📊📈💰🎯
Be conversational, accurate, and engaging for voice narration.`;

    const answer = await callGroqAPI([
      { role: 'system', content: 'You are an expert data analyst. Always use correct calculations and cite actual numbers from the data.' },
      { role: 'user', content: prompt }
    ]);

    let responseType = 'text';
    let chartData = null;
    let cleanedAnswer = answer;

    if (answer.includes('SHOW_CHART')) {
      responseType = 'chart';
      cleanedAnswer = answer.replace('SHOW_CHART', '').trim();
      chartData = csvData.data.slice(0, 10).map((row, i) => ({
        label: `${row[0]} - ${row[1] || i}`,
        value: row[csvData.headers.length - 1] || 0
      }));
    }

    if (datasetId) {
      await Analysis.create({
        userId: req.user.uid,
        datasetId: datasetId,
        question: question,
        answer: cleanedAnswer,
        confidence: validation.confidence,
        metrics: {
          dataPoints: validation.rowCount,
          timeRange: `${csvData.data.length} records`
        }
      });
    }

    console.log('✅ Analysis complete');
    
    res.json({ 
      success: true, 
      type: responseType, 
      content: cleanedAnswer, 
      chartData,
      confidence: validation.confidence,
      metadata: {
        totalRevenue: validation.totalRevenue,
        rowCount: validation.rowCount,
        warnings: validation.warnings
      }
    });
  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/datasets', verifyToken, async (req, res) => {
  try {
    const datasets = await Dataset.find({ userId: req.user.uid })
      .sort({ uploadedAt: -1 })
      .limit(10);
    res.json({ success: true, datasets });
  } catch (error) {
    console.error('❌ Error fetching datasets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/analyses', verifyToken, async (req, res) => {
  try {
    const analyses = await Analysis.find({ userId: req.user.uid })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json({ success: true, analyses });
  } catch (error) {
    console.error('❌ Error fetching analyses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MONGODB ANALYSIS HISTORY & COMPARISON ROUTES
// ============================================

// 1. Save Complete Analysis
app.post('/api/save-analysis', verifyToken, async (req, res) => {
  try {
    const { rawData, csvData, analysis, dataType, tags } = req.body;

    const newAnalysis = new Analysis({
      userId: req.user.uid,
      userEmail: req.user.email,
      userName: req.user.name,
      rawData,
      csvData,
      analysis,
      dataType: dataType || 'sales',
      tags: tags || ['auto-saved'],
      questions: []
    });

    await newAnalysis.save();
    console.log('✅ Full analysis saved:', newAnalysis._id);

    res.json({
      success: true,
      message: 'Analysis saved successfully',
      analysisId: newAnalysis._id
    });
  } catch (error) {
    console.error('❌ Save analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save analysis'
    });
  }
});

// 2. Get User's Analysis History
app.get('/api/analysis-history', verifyToken, async (req, res) => {
  try {
    const { limit = 10, dataType } = req.query;

    const query = { userId: req.user.uid };
    if (dataType) query.dataType = dataType;

    const analyses = await Analysis.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-rawData -csvData.data'); // Don't send full data in list

    res.json({
      success: true,
      count: analyses.length,
      analyses
    });
  } catch (error) {
    console.error('❌ Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history'
    });
  }
});

// 3. Get Specific Analysis by ID
app.get('/api/analysis/:id', verifyToken, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user.uid // Ensure user owns this
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('❌ Get analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis'
    });
  }
});

// 4. Add Question to Existing Analysis
app.post('/api/analysis/:id/question', verifyToken, async (req, res) => {
  try {
    const { question, answer, confidence } = req.body;

    const analysis = await Analysis.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.uid
      },
      {
        $push: {
          questions: {
            question,
            answer,
            confidence: confidence || 'medium',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      message: 'Question saved to analysis history',
      analysis
    });
  } catch (error) {
    console.error('❌ Save question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save question'
    });
  }
});

// 5. Compare Current Analysis with Past Performance
app.post('/api/compare-analysis', verifyToken, async (req, res) => {
  try {
    const { currentMetrics, dataType } = req.body;

    // Get past analyses of same type
    const pastAnalyses = await Analysis.find({
      userId: req.user.uid,
      dataType: dataType || 'sales',
      'analysis.metrics.totalRevenue': { $exists: true }
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .select('analysis.metrics timestamp');

    if (pastAnalyses.length === 0) {
      return res.json({
        success: true,
        comparison: {
          hasHistory: false,
          message: 'This is your first analysis. Future analyses will be compared with this baseline.'
        }
      });
    }

    // Calculate averages from past data
    const pastMetrics = pastAnalyses.map(a => a.analysis.metrics);
    const avgPastRevenue = pastMetrics.reduce((sum, m) => sum + (m.totalRevenue || 0), 0) / pastMetrics.length;
    const avgPastGrowth = pastMetrics.reduce((sum, m) => sum + (m.growthRate || 0), 0) / pastMetrics.length;

    const revenueChange = ((currentMetrics.totalRevenue - avgPastRevenue) / avgPastRevenue) * 100;
    const growthChange = currentMetrics.growthRate - avgPastGrowth;

    // Generate AI comparison insight
    const comparisonPrompt = `Compare current business performance with historical data:

CURRENT PERFORMANCE:
- Revenue: ₹${currentMetrics.totalRevenue.toLocaleString()}
- Growth Rate: ${currentMetrics.growthRate.toFixed(1)}%
- Data Points: ${currentMetrics.dataPoints}

HISTORICAL AVERAGE (${pastAnalyses.length} past analyses):
- Avg Revenue: ₹${avgPastRevenue.toLocaleString()}
- Avg Growth: ${avgPastGrowth.toFixed(1)}%

CHANGES:
- Revenue Change: ${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%
- Growth Change: ${growthChange > 0 ? '+' : ''}${growthChange.toFixed(1)}%

Provide a brief 2-3 sentence analysis highlighting key improvements or concerns. Be conversational and actionable.`;

    const aiComparison = await callGroqAPI([
      {
        role: 'system',
        content: 'You are a business analyst comparing current performance with historical trends.'
      },
      {
        role: 'user',
        content: comparisonPrompt
      }
    ]);

    res.json({
      success: true,
      comparison: {
        hasHistory: true,
        pastAnalysesCount: pastAnalyses.length,
        metrics: {
          current: currentMetrics,
          pastAverage: {
            totalRevenue: avgPastRevenue,
            growthRate: avgPastGrowth
          },
          changes: {
            revenueChange: revenueChange.toFixed(1),
            growthChange: growthChange.toFixed(1)
          }
        },
        aiInsight: aiComparison,
        oldestAnalysis: pastAnalyses[pastAnalyses.length - 1].timestamp,
        newestAnalysis: pastAnalyses[0].timestamp
      }
    });
  } catch (error) {
    console.error('❌ Compare analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare analysis'
    });
  }
});

// 6. Delete Analysis (BONUS)
app.delete('/api/analysis/:id', verifyToken, async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.uid
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete analysis'
    });
  }
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  
  // Check if build folder exists
  if (fs.existsSync(buildPath)) {
    console.log('📦 Serving frontend from:', buildPath);
    app.use(express.static(buildPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    console.error('❌ Frontend build folder not found at:', buildPath);
    console.log('🔧 Run: cd frontend && npm run build');
  }
} else {
  console.log('🔧 Running in DEVELOPMENT mode - frontend NOT served');
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 InsightAI Backend - Production Ready`);
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Disconnected'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Closing server gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

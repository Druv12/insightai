const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const statisticalAnalysis = require('./utils/statisticalAnalysis');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

require('dotenv').config();


// ============================================
// SECURITY UTILITIES
// ============================================

// Sanitize CSV to prevent formula injection
const sanitizeCSV = (csvData) => {
  return csvData
    .split('\n')
    .map(line => {
      // Remove formula injection characters at start
      if (/^[=+\-@\t\r]/.test(line)) {
        return "'" + line; // Prefix with quote to neutralize
      }
      return line;
    })
    .join('\n');
};

// Validate file MIME type (not just extension)
const validateFileType = async (filePath, allowedTypes) => {
  try {
    const FileType = (await import('file-type')).default;
    const fileTypeResult = await FileType.fromFile(filePath);
    
    if (!fileTypeResult) {
      // Some valid files don't have detectable MIME (like plain text CSV)
      return true;
    }
    
    return allowedTypes.includes(fileTypeResult.mime);
  } catch (error) {
    console.error('File type validation error:', error);
    return false;
  }
};

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special chars
    .substring(0, 255); // Limit length
};

// Sanitize MongoDB query parameters
const sanitizeMongoInput = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  // Remove MongoDB operators
  return value.replace(/[${}]/g, '');
};

// Validate against whitelist
const validateDataType = (dataType) => {
  const allowedTypes = ['sales', 'marketing', 'fintech', 'ecommerce', 'saas', 'business'];
  return allowedTypes.includes(dataType) ? dataType : undefined;
};
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Middleware
const rateLimit = require('express-rate-limit');
const timeout = require('connect-timeout');

app.use(timeout('60s')); // 60 second timeout
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// ✅ SECURE: Restrict CORS to specific origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL, // e.g., 'https://insightai.vercel.app'
      'https://your-custom-domain.com'
    ].filter(Boolean) // Remove undefined values
  : [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000'
    ];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ Blocked CORS request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
// General API rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter limit for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'AI request limit exceeded. Please wait.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/analyze', aiLimiter);
app.use('/api/parse-data', aiLimiter);
app.use('/api/compare-analysis', aiLimiter);

// Stricter limit for file uploads (resource intensive)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Only 5 uploads per minute
  message: 'Too many file uploads. Please wait before uploading again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Validate GROQ API key format
if (GROQ_API_KEY && !GROQ_API_KEY.startsWith('gsk_')) {
  console.error('❌ GROQ_API_KEY appears to be invalid. Should start with "gsk_"');
  console.error('   Current key starts with:', GROQ_API_KEY.substring(0, 4));
}

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is missing! AI features will not work.');
  console.error('   Please add GROQ_API_KEY to your .env file');
}

// ✅ SECURE: No key details exposed
console.log('🔑 GROQ_API_KEY:', GROQ_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('🔑 MONGODB_URI:', MONGODB_URI ? '✅ Configured' : '❌ Missing');
// Secure error handler - hides details in production
// ✅ SECURE: Never expose internal errors
const handleError = (res, error, customMessage = 'An error occurred') => {
  // Log full error server-side only
  console.error('❌ Error Details [INTERNAL]:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // NEVER send internal errors to client
  res.status(500).json({ 
    success: false, 
    error: customMessage // Always use generic message
  });
};

// ============================================
// MONGODB CONNECTION WITH AUTO-RETRY
// ============================================
let isConnecting = false;

const connectDB = async () => {
  if (isConnecting) return;
  
  isConnecting = true;
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    isConnecting = false;
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isConnecting = false;
    
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Connection event handlers
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

// Start connection
connectDB();

// MongoDB Schemas (same as before)
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
    industryType: String,
    dataQuality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' }
  },
  uploadedAt: { type: Date, default: Date.now }
});

const analysisSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: String,
  userName: String,
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
  rawData: String,
  csvData: {
    headers: [String],
    data: [[mongoose.Schema.Types.Mixed]]
  },
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
  questions: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    timestamp: { type: Date, default: Date.now }
  }],
  industryType: String,
  tags: [String],
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

analysisSchema.index({ userId: 1, timestamp: -1 });

const User = mongoose.model('User', userSchema);
const Dataset = mongoose.model('Dataset', datasetSchema);
const Analysis = mongoose.model('Analysis', analysisSchema);
// ============================================
// MONGODB MIDDLEWARE - Protect routes when DB is down
// ============================================
const requireMongoDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      success: false, 
      error: 'Database temporarily unavailable. Please try again.' 
    });
  }
  next();
};

// ✅ Initialize Firebase Admin with Base64 Support
let admin;
try {
  let serviceAccount;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Production: Read from base64 environment variable
    console.log('🔑 Loading Firebase credentials from base64 environment variable...');
    const base64Json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const jsonString = Buffer.from(base64Json, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(jsonString);
    console.log('✅ Firebase credentials decoded from base64');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Alternative: Read from file path
    console.log('🔑 Loading Firebase credentials from file path...');
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  } else {
    // Local development: Read from local file
    console.log('🔑 Loading Firebase credentials from local file...');
    serviceAccount = require('./firebase-service-account.json');
  }

  admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  console.log('✅ Firebase Admin initialized successfully');
  console.log('✅ Project ID:', serviceAccount.project_id);
  
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.log('🔓 Running in NO-AUTH mode for testing');
}
const verifyToken = async (req, res, next) => {
  try {
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
// INDUSTRY DETECTION LOGIC
// ============================================
function detectIndustry(headers) {
  const headerStr = headers.join(',').toLowerCase();
  
  if (headerStr.includes('mau') || headerStr.includes('dau') || headerStr.includes('arpu') || headerStr.includes('retention')) {
    return 'fintech';
  }
  if (headerStr.includes('conversion') || headerStr.includes('ctr') || headerStr.includes('impressions') || headerStr.includes('clicks')) {
    return 'marketing';
  }
  if (headerStr.includes('product') || headerStr.includes('units') || headerStr.includes('inventory')) {
    return 'ecommerce';
  }
  if (headerStr.includes('subscription') || headerStr.includes('churn') || headerStr.includes('mrr')) {
    return 'saas';
  }
  return 'business'; // Generic business analytics
}

// ============================================
// ENHANCED DATA VALIDATION
// ============================================
function validateData(csvData) {
  const warnings = [];
  const rowCount = csvData.data.length;
  
  if (rowCount < 3) {
    warnings.push('⚠️ Very limited data. Analysis confidence: LOW');
  } else if (rowCount < 10) {
    warnings.push('⚠️ Small dataset. Consider adding more data');
  }
  
  // Detect revenue/amount column
  const revenueColIndex = csvData.headers.findIndex(h => 
    h.toLowerCase().includes('revenue') || 
    h.toLowerCase().includes('amount') ||
    h.toLowerCase().includes('sales')
  );
  
  let totalRevenue = 0;
  if (revenueColIndex !== -1) {
    const hasNegative = csvData.data.some(row => row[revenueColIndex] < 0);
    if (hasNegative) {
      warnings.push('❌ Negative values detected. Please verify data');
    }
    
    totalRevenue = csvData.data.reduce((sum, row) => {
      const value = parseFloat(row[revenueColIndex]) || 0;
      return sum + value;
    }, 0);
  }
  
  let confidence = rowCount >= 50 ? 'high' : rowCount >= 10 ? 'medium' : 'low';
  
  return { 
    warnings, 
    totalRevenue, 
    confidence, 
    rowCount,
    industryType: detectIndustry(csvData.headers)
  };
}

// ============================================
// GROQ API HELPER WITH DETAILED LOGGING
// ============================================
async function callGroqAPI(messages) {
  // ✅ SECURE: Conditional logging only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🤖 [GROQ] Starting API call...');
    console.log('🤖 [GROQ] API Key present:', !!GROQ_API_KEY);
  }
  
  if (!GROQ_API_KEY) {
    console.error('❌ [GROQ] API Key is missing!');
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (!GROQ_API_KEY.startsWith('gsk_')) {
    console.error('❌ [GROQ] Invalid API Key format!');
    // ✅ SECURE: No key details in production
    if (process.env.NODE_ENV === 'development') {
      console.error('   Expected: gsk_...');
      console.error('   Got:', GROQ_API_KEY.substring(0, 10) + '...');
    }
    throw new Error('Invalid GROQ_API_KEY format. Key should start with "gsk_"');
  }
  const requestPayload = {
    model: 'llama-3.3-70b-versatile',
    messages: messages,
    temperature: 0.7,
    max_tokens: 4000
  };

  console.log('🤖 [GROQ] Request payload:', JSON.stringify({
    model: requestPayload.model,
    messageCount: messages.length,
    temperature: requestPayload.temperature,
    max_tokens: requestPayload.max_tokens
  }));

  try {
    console.log('🤖 [GROQ] Sending request to:', GROQ_API_URL);
    
    const response = await axios.post(GROQ_API_URL, requestPayload, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ [GROQ] API call successful!');
    console.log('✅ [GROQ] Response status:', response.status);
    console.log('✅ [GROQ] Response length:', response.data.choices[0].message.content.length);
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('❌ [GROQ] API call failed!');
    
    if (error.response) {
      console.error('❌ [GROQ] Status:', error.response.status);
      console.error('❌ [GROQ] Error data:', JSON.stringify(error.response.data, null, 2));
      console.error('❌ [GROQ] Headers:', JSON.stringify(error.response.headers, null, 2));
      
      const errorMessage = error.response.data?.error?.message || 'Unknown error';
      throw new Error(`GROQ API Error (${error.response.status}): ${errorMessage}`);
      
    } else if (error.request) {
      console.error('❌ [GROQ] Network error - no response received');
      throw new Error('Network error connecting to GROQ API');
      
    } else {
      console.error('❌ [GROQ] Unexpected error:', error.message);
      console.error('❌ [GROQ] Stack trace:', error.stack);
      throw error;
    }
  }
}

// ============================================
// COMPREHENSIVE STATISTICAL AGGREGATION
// ============================================
const calculateComprehensiveStats = (csvData) => {
  const { headers, data } = csvData;
  
  if (!data || data.length === 0) {
    return null;
  }

  const stats = {
    overview: {
      totalRows: data.length,
      dataQuality: data.length >= 1000 ? 'excellent' : data.length >= 100 ? 'good' : 'fair',
      timeRange: 'full dataset'
    },
    columns: {},
    patterns: {},
    segments: {}
  };

  // Analyze each column
  headers.forEach((header, colIndex) => {
    const values = data.map(row => row[colIndex]);
    const columnType = typeof values[0] === 'number' ? 'numeric' : 'categorical';
    
    if (columnType === 'numeric') {
      // Numeric column analysis
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      
      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        
        stats.columns[header] = {
          type: 'numeric',
          count: numericValues.length,
          sum: sum,
          mean: sum / numericValues.length,
          median: sorted[Math.floor(sorted.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1],
          stdDev: calculateStdDev(numericValues),
          distribution: createDistribution(numericValues, 5)
        };
      }
    } else {
      // Categorical column analysis
      const frequency = {};
      values.forEach(val => {
        const key = String(val);
        frequency[key] = (frequency[key] || 0) + 1;
      });
      
      const sorted = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      stats.columns[header] = {
        type: 'categorical',
        uniqueValues: Object.keys(frequency).length,
        topValues: sorted.map(([value, count]) => ({
          value,
          count,
          percentage: ((count / data.length) * 100).toFixed(2)
        })),
        distribution: Object.fromEntries(sorted)
      };
    }
  });

  // Detect revenue/amount columns
  const revenueCol = headers.findIndex(h => 
    h.toLowerCase().includes('revenue') || 
    h.toLowerCase().includes('amount') || 
    h.toLowerCase().includes('sales') ||
    h.toLowerCase().includes('price')
  );

  if (revenueCol >= 0 && stats.columns[headers[revenueCol]]) {
    const revenueStats = stats.columns[headers[revenueCol]];
    stats.overview.totalRevenue = revenueStats.sum;
    stats.overview.avgRevenue = revenueStats.mean;
    stats.overview.revenueRange = `₹${revenueStats.min.toLocaleString()} - ₹${revenueStats.max.toLocaleString()}`;
  }

  // Detect quantity columns
  const quantityCol = headers.findIndex(h => 
    h.toLowerCase().includes('quantity') || 
    h.toLowerCase().includes('units') || 
    h.toLowerCase().includes('count')
  );

  if (quantityCol >= 0 && stats.columns[headers[quantityCol]]) {
    stats.overview.totalQuantity = stats.columns[headers[quantityCol]].sum;
  }

  // Time-based analysis (if date column exists)
  const dateCol = headers.findIndex(h => 
    h.toLowerCase().includes('date') || 
    h.toLowerCase().includes('month') || 
    h.toLowerCase().includes('year') ||
    h.toLowerCase().includes('time')
  );

  if (dateCol >= 0) {
    const timeValues = data.map(row => row[dateCol]);
    const timeDistribution = {};
    
    timeValues.forEach(val => {
      const key = String(val);
      timeDistribution[key] = (timeDistribution[key] || 0) + 1;
    });
    
    stats.patterns.timeSeriesDistribution = Object.entries(timeDistribution)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, count]) => ({ period, count }));
    
    // Calculate growth if we have revenue
    if (revenueCol >= 0) {
      const periods = Object.keys(timeDistribution).sort();
      if (periods.length >= 2) {
        const firstPeriod = periods[0];
        const lastPeriod = periods[periods.length - 1];
        
        const firstPeriodData = data.filter(row => String(row[dateCol]) === firstPeriod);
        const lastPeriodData = data.filter(row => String(row[dateCol]) === lastPeriod);
        
        const firstRevenue = firstPeriodData.reduce((sum, row) => sum + (row[revenueCol] || 0), 0);
        const lastRevenue = lastPeriodData.reduce((sum, row) => sum + (row[revenueCol] || 0), 0);
        
        if (firstRevenue > 0) {
          stats.overview.growthRate = ((lastRevenue - firstRevenue) / firstRevenue) * 100;
        }
      }
    }
  }

  // Status/Category segmentation
  const statusCol = headers.findIndex(h => 
    h.toLowerCase().includes('status') || 
    h.toLowerCase().includes('state') ||
    h.toLowerCase().includes('category')
  );

  if (statusCol >= 0) {
    const statusValues = data.map(row => row[statusCol]);
    const statusFreq = {};
    
    statusValues.forEach(val => {
      const key = String(val);
      statusFreq[key] = (statusFreq[key] || 0) + 1;
    });
    
    stats.segments.byStatus = Object.entries(statusFreq).map(([status, count]) => ({
      status,
      count,
      percentage: ((count / data.length) * 100).toFixed(2)
    }));

    // Churn analysis if status contains "churn"
    const churnedCount = statusValues.filter(v => 
      String(v).toLowerCase().includes('churn')
    ).length;
    
    if (churnedCount > 0) {
      stats.overview.churnRate = ((churnedCount / data.length) * 100).toFixed(2);
      stats.overview.churnedUsers = churnedCount;
      stats.overview.activeUsers = data.length - churnedCount;
    }
  }

  // Geographic analysis
  const countryCol = headers.findIndex(h => 
    h.toLowerCase().includes('country') || 
    h.toLowerCase().includes('region') ||
    h.toLowerCase().includes('location')
  );

  if (countryCol >= 0) {
    const countries = data.map(row => row[countryCol]);
    const countryFreq = {};
    
    countries.forEach(val => {
      const key = String(val);
      countryFreq[key] = (countryFreq[key] || 0) + 1;
    });
    
    stats.segments.byGeography = Object.entries(countryFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({
        country,
        count,
        percentage: ((count / data.length) * 100).toFixed(2)
      }));
  }

  // Channel analysis
  const channelCol = headers.findIndex(h => 
    h.toLowerCase().includes('channel') || 
    h.toLowerCase().includes('source') ||
    h.toLowerCase().includes('acquisition')
  );

  if (channelCol >= 0) {
    const channels = data.map(row => row[channelCol]);
    const channelFreq = {};
    
    channels.forEach(val => {
      const key = String(val);
      channelFreq[key] = (channelFreq[key] || 0) + 1;
    });
    
    stats.segments.byChannel = Object.entries(channelFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({
        channel,
        count,
        percentage: ((count / data.length) * 100).toFixed(2)
      }));
  }

  return stats;
};

// Helper function: Calculate standard deviation
const calculateStdDev = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
};

// Helper function: Create distribution buckets
const createDistribution = (values, bucketCount = 5) => {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bucketSize = (max - min) / bucketCount;
  
  const buckets = {};
  for (let i = 0; i < bucketCount; i++) {
    const start = min + (i * bucketSize);
    const end = i === bucketCount - 1 ? max : start + bucketSize;
    const key = `${start.toFixed(0)}-${end.toFixed(0)}`;
    buckets[key] = 0;
  }
  
  values.forEach(val => {
    const bucketIndex = Math.min(Math.floor((val - min) / bucketSize), bucketCount - 1);
    const start = min + (bucketIndex * bucketSize);
    const end = bucketIndex === bucketCount - 1 ? max : start + bucketSize;
    const key = `${start.toFixed(0)}-${end.toFixed(0)}`;
    buckets[key]++;
  });
  
  return buckets;
};

// ============================================
// TEXT-TO-SPEECH FORMATTING HELPER
// ============================================
const convertToIndianFormat = (text) => {
  // Convert large numbers to lakhs/crores for better speech
  return text.replace(/₹[\d,]+/g, (match) => {
    const number = parseFloat(match.replace(/[₹,]/g, ''));
    
    if (isNaN(number)) return match;
    
    if (number >= 10000000) {
      // Crores
      const crores = number / 10000000;
      // ✅ FIXED: Remove "rupees" when using lakhs/crores
      return crores % 1 === 0 
        ? `${crores} crore` 
        : `${crores.toFixed(2)} crore`;
    } else if (number >= 100000) {
      // Lakhs
      const lakhs = number / 100000;
      // ✅ FIXED: Remove "rupees" when using lakhs/crores
      return lakhs % 1 === 0 
        ? `${lakhs} lakh` 
        : `${lakhs.toFixed(2)} lakh`;
    } else if (number >= 1000) {
      // Thousands - add "rupees" for smaller amounts
      return `${number.toLocaleString('en-IN')} rupees`;
    } else {
      return `${number} rupees`;
    }
  });
};

// ============================================
// SMART SAMPLING FOR EXAMPLES
// ============================================
const extractRepresentativeSamples = (csvData, sampleSize = 60) => {
  const { headers, data } = csvData;
  
  if (data.length <= sampleSize) {
    return { headers, data };
  }

  const samples = [];
  
  // Strategy 1: First rows (early period)
  samples.push(...data.slice(0, Math.min(15, data.length)));
  
  // Strategy 2: Last rows (recent period)
  samples.push(...data.slice(-15));
  
  // Strategy 3: High performers (if revenue column exists)
  const revenueCol = headers.findIndex(h => 
    h.toLowerCase().includes('revenue') || 
    h.toLowerCase().includes('amount')
  );
  
  if (revenueCol >= 0) {
    const sorted = [...data].sort((a, b) => (b[revenueCol] || 0) - (a[revenueCol] || 0));
    samples.push(...sorted.slice(0, 10));
  }
  
  // Strategy 4: Churned/Problem cases (if status column exists)
  const statusCol = headers.findIndex(h => 
    h.toLowerCase().includes('status')
  );
  
  if (statusCol >= 0) {
    const churned = data.filter(row => 
      String(row[statusCol]).toLowerCase().includes('churn')
    );
    samples.push(...churned.slice(0, 10));
  }
  
  // Strategy 5: Random diverse samples
  const step = Math.floor(data.length / 10);
  for (let i = 0; i < data.length && samples.length < sampleSize; i += step) {
    samples.push(data[i]);
  }
  
  // Remove duplicates
  const uniqueSamples = Array.from(
    new Set(samples.map(row => JSON.stringify(row)))
  ).map(str => JSON.parse(str));
  
  return {
    headers,
    data: uniqueSamples.slice(0, sampleSize)
  };
};

// ============================================
// DEMO DATASETS API
// ============================================
app.get('/api/demo-datasets', (req, res) => {
  const datasets = {
    ecommerce: {
      name: "E-commerce Sales Demo",
      data: `Month,Product,Units,Revenue
January,Mobile,850,680000
January,Laptop,320,1440000
February,Mobile,920,736000
February,Laptop,340,1530000
March,Mobile,980,784000
March,Laptop,365,1642500
April,Mobile,1050,840000
April,Laptop,380,1710000`
    },
    fintech: {
      name: "FinTech Metrics Demo",
      data: `Month,MAU,Paying_Users,Transactions,Revenue,ARPU,Retention
July,125000,48000,890000,625000,5.00,78.5
August,132000,52000,945000,660000,5.00,79.2
September,138000,55000,985000,690000,5.00,80.1
October,145000,58000,1050000,725000,5.00,81.0
November,142000,56000,1020000,710000,5.00,79.8
December,148000,60000,1100000,740000,5.00,82.0`
    },
    marketing: {
      name: "Marketing Campaign Demo",
      data: `Campaign,Impressions,Clicks,Conversions,Spend,Revenue
Google_Ads,50000,2500,150,25000,90000
Facebook,45000,2200,120,20000,72000
Instagram,38000,1900,100,18000,60000
LinkedIn,28000,1400,80,15000,48000
Twitter,35000,1750,95,17000,57000`
    }
  };
  
  res.json({ success: true, datasets });
});

// ============================================
// FILE UPLOAD ENDPOINT
// ============================================

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// File upload endpoint
// ✅ SECURE: Protected file upload with validation
app.post('/api/upload-file', verifyToken, uploadLimiter, upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;
    filePath = file.path;

    console.log(`📁 Processing file: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);
    console.log(`👤 User: ${req.user.email}`);

    // ✅ SECURITY: Validate file extension
    const allowedExtensions = ['csv', 'xlsx', 'xls', 'pdf', 'docx', 'doc'];
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid file type. Only CSV, Excel, PDF, and Word files are allowed.' 
      });
    }

    // ✅ SECURITY: Validate MIME type (prevent extension spoofing)
    const allowedMimeTypes = [
      'text/csv', 
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const isValidType = await validateFileType(filePath, allowedMimeTypes);
    if (!isValidType && fileExtension !== 'csv') {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        error: 'File content does not match its extension. Potential security risk detected.' 
      });
    }

    // ✅ SECURITY: Validate file size (already limited by multer, but double-check)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        error: 'File too large. Maximum size is 50MB.' 
      });
    }

    let extractedData = '';

    // Process CSV files
    if (fileExtension === 'csv') {
      const rawData = fs.readFileSync(file.path, 'utf-8');
      
      // ✅ SECURITY: Sanitize CSV content to prevent formula injection
      extractedData = sanitizeCSV(rawData);
      
      const lineCount = extractedData.split('\n').length;
      console.log(`📊 CSV has ${lineCount} lines`);
      
      if (lineCount > 10000) {
        console.warn(`⚠️ Very large CSV (${lineCount} lines) - may take longer to process`);
      }
    }
    
    // Process Excel files
    else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawCSV = XLSX.utils.sheet_to_csv(sheet);
      
      // ✅ SECURITY: Sanitize Excel-generated CSV
      extractedData = sanitizeCSV(rawCSV);
      
      const lineCount = extractedData.split('\n').length;
      console.log(`📊 Excel converted to CSV with ${lineCount} lines`);
    }
    
    // Process PDF files
    else if (fileExtension === 'pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await pdf(dataBuffer);
      extractedData = pdfData.text;
      console.log(`📄 PDF extracted: ${pdfData.numpages} pages`);
    }
    
    // Process Word files
    else if (fileExtension === 'docx' || fileExtension === 'doc') {
      const result = await mammoth.extractRawText({ path: file.path });
      extractedData = result.value;
      console.log(`📝 Word document extracted`);
    }

    // ✅ SECURITY: Validate extracted data
    if (!extractedData || extractedData.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not extract data from file. File may be corrupted or empty.' 
      });
    }

    // ✅ SECURITY: Limit extracted data size
    const maxExtractedSize = 10 * 1024 * 1024; // 10MB text
    if (extractedData.length > maxExtractedSize) {
      extractedData = extractedData.substring(0, maxExtractedSize);
      console.warn('⚠️ Data truncated to 10MB');
    }

    const dataSizeKB = Buffer.byteLength(extractedData, 'utf8') / 1024;
    console.log(`📦 Extracted data size: ${dataSizeKB.toFixed(2)} KB`);

    res.json({
      success: true,
      extractedData: extractedData,
      fileName: sanitizeFilename(file.originalname),
      fileSize: file.size,
      extractedSize: dataSizeKB,
      rowCount: extractedData.split('\n').length
    });

  } catch (error) {
    console.error('❌ File processing error:', error.message);
    handleError(res, error, 'Failed to process file. Please ensure the file is not corrupted.');
  } finally {
    // ✅ SECURITY: Always cleanup uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleaned up file:', filePath);
      } catch (cleanupError) {
        console.error('⚠️ File cleanup failed:', cleanupError.message);
      }
    }
  }
});
// ============================================
// ROUTES
// ============================================

app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      groq: GROQ_API_KEY ? 'configured' : 'missing',
      firebase: admin ? 'configured' : 'missing'
    },
    version: '1.0.0'
  };
  
  const isHealthy = 
    health.checks.mongodb === 'connected' && 
    health.checks.groq === 'configured';
  
  const statusCode = isHealthy ? 200 : 503;
  
  if (!isHealthy) {
    health.status = 'DEGRADED';
  }
  
  res.status(statusCode).json(health);
});

// Root welcome route - ADD THIS SECTION
app.get('/', (req, res) => {
  res.json({
    message: '🚀 InsightAI Backend API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      demoDatasets: '/api/demo-datasets',
      uploadFile: '/api/upload-file',
      parseData: '/api/parse-data',
      analyze: '/api/analyze',
      saveAnalysis: '/api/save-analysis',
      analysisHistory: '/api/analysis-history',
      compareAnalysis: '/api/compare-analysis'
    },
    docs: 'https://github.com/Druv12/insightai',
    frontend: process.env.FRONTEND_URL || 'Deploy frontend separately'
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
    handleError(res, error, 'Failed to login. Please try again.');
  }
});

app.post('/api/parse-data', verifyToken, async (req, res) => {
  console.log('📥 [PARSE] ==================== NEW PARSE REQUEST ====================');
  
  try {
    const { rawData } = req.body;
    
    console.log('📥 [PARSE] User:', req.user.email);
    console.log('📥 [PARSE] Raw data length:', rawData?.length || 0);
    
    if (!rawData?.trim()) {
      console.error('❌ [PARSE] No data provided');
      return res.status(400).json({ success: false, error: 'No data provided' });
    }

    // Sanitize and limit input size
    const sanitizedData = rawData
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .slice(0, 5000000); // 5MB text limit

    console.log('📊 Parsing data for user:', req.user.email);
    
    const lines = sanitizedData.trim().split('\n');
    const firstLine = lines[0];
    const rowCount = lines.length;
    
    // Check if already CSV format
    const isAlreadyCSV = firstLine.includes(',') && rowCount > 1;
    
    let csvText;
    let processingMethod = '';
    
    // ============================================
    // TIER 1: SMALL FILES (≤50 rows) - AI Enhanced
    // ============================================
    if (isAlreadyCSV && rowCount <= 50) {
      console.log('🤖 Small CSV detected (', rowCount, 'rows) - using AI for cleanup');
      processingMethod = 'ai_enhanced';
      
      const prompt = `Clean and standardize this CSV. Return ONLY the CSV, no explanations.

DATA: ${sanitizedData}

RULES:
- Keep all columns
- Standardize formatting
- Remove any invalid rows
- NO markdown, NO explanations

CSV:`;

      csvText = await callGroqAPI([
        { role: 'system', content: 'Return ONLY CSV format, no explanations.' },
        { role: 'user', content: prompt }
      ]);
      
    } 
    // ============================================
    // TIER 2: MEDIUM FILES (51-1000 rows) - Direct Parse
    // ============================================
    else if (isAlreadyCSV && rowCount > 50 && rowCount <= 1000) {
      console.log('✅ Medium CSV detected (', rowCount, 'rows) - parsing directly');
      processingMethod = 'direct_parse';
      csvText = sanitizedData.trim();
      
    } 
    // ============================================
    // TIER 3: LARGE FILES (1000+ rows) - Smart Sampling
    // ============================================
    else if (isAlreadyCSV && rowCount > 1000) {
      console.log('📦 Large CSV detected (', rowCount, 'rows) - using smart sampling');
      processingMethod = 'smart_sampling';
      
      // Process the full dataset directly (no AI needed for valid CSV)
      csvText = sanitizedData.trim();
      
    } 
    // ============================================
    // TIER 4: UNSTRUCTURED DATA - AI Conversion
    // ============================================
    else {
      console.log('🤖 Unstructured data detected - using AI to convert');
      processingMethod = 'ai_conversion';
      
      // For large unstructured data, send only first 200 lines
      const sampleData = rowCount > 200 
        ? lines.slice(0, 200).join('\n') + '\n\n... (Dataset continues with ' + (rowCount - 200) + ' more rows)'
        : sanitizedData;
      
      const prompt = `Parse this data into CSV format. Return ONLY the CSV, no explanations.

DATA: ${sampleData}

RULES:
- Extract all columns (dates, products, quantities, amounts, metrics, etc.)
- First row: headers
- Clean and standardize
- NO markdown, NO explanations

CSV:`;

      try {
        csvText = await callGroqAPI([
          { role: 'system', content: 'Return ONLY CSV format, no explanations.' },
          { role: 'user', content: prompt }
        ]);
      } catch (apiError) {
        if (apiError.response?.status === 413) {
          console.error('⚠️ Payload too large for AI - falling back to direct parse');
          csvText = sanitizedData.trim();
          processingMethod = 'fallback_direct';
        } else {
          throw apiError;
        }
      }
    }

    // ============================================
    // PARSE CSV INTO STRUCTURED FORMAT
    // ============================================
    let cleanedCSV = csvText.trim()
      .replace(/```csv\n?/g, '')
      .replace(/```/g, '')
      .replace(/\r\n/g, '\n');
    
    const csvLines = cleanedCSV.split('\n').filter(line => line.trim() && !line.includes('... ('));
    
    if (csvLines.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not parse data. Please ensure file has at least a header row and one data row.' 
      });
    }
    
    // Parse headers
    const headers = csvLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Parse data rows with error handling
    const data = [];
    let skippedRows = 0;
    
    for (let i = 1; i < csvLines.length; i++) {
      try {
        const row = csvLines[i].split(',').map(cell => {
          const cleaned = cell.trim().replace(/"/g, '');
          const num = parseFloat(cleaned.replace(/[$,₹]/g, ''));
          return isNaN(num) ? cleaned : num;
        });
        
        // Only add rows with correct column count
        if (row.length === headers.length) {
          data.push(row);
        } else {
          skippedRows++;
        }
      } catch (rowError) {
        skippedRows++;
        console.warn(`⚠️ Skipped malformed row ${i}`);
      }
    }

    if (data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid data rows found after parsing.' 
      });
    }

    console.log(`✅ Parsed ${data.length} valid rows (skipped ${skippedRows} malformed rows)`);

    const csvData = { headers, data };
    const validation = validateData(csvData);
    
    console.log('🏭 DETECTED INDUSTRY:', validation.industryType);
    console.log('📊 Data Quality:', validation.confidence);
    console.log('📈 Total Revenue:', validation.totalRevenue);
    console.log('🔧 Processing Method:', processingMethod);
    
    // Save to database with size-aware storage
    const shouldStoreFullData = data.length <= 1000;
    
    const dataset = await Dataset.create({
      userId: req.user.uid,
      datasetName: `Dataset ${new Date().toLocaleDateString()}`,
      rawData: shouldStoreFullData ? rawData.substring(0, 50000) : rawData.substring(0, 10000),
      parsedData: shouldStoreFullData ? csvData : {
        headers: csvData.headers,
        data: csvData.data.slice(0, 1000)
      },
      metadata: {
        rowCount: validation.rowCount,
        totalRevenue: validation.totalRevenue,
        industryType: validation.industryType,
        dataQuality: validation.confidence === 'high' ? 'excellent' : 
                     validation.confidence === 'medium' ? 'good' : 'fair',
        processingMethod: processingMethod,
        originalRowCount: rowCount,
        skippedRows: skippedRows
      }
    });

    console.log(`✅ Dataset saved with ID: ${dataset._id}`);
    
    res.json({ 
      success: true, 
      csvData, 
      rowCount: data.length,
      originalRowCount: rowCount,
      skippedRows: skippedRows,
      validation,
      datasetId: dataset._id,
      industryType: validation.industryType,
      processingMethod: processingMethod,
      message: data.length >= 1000 
        ? `Successfully processed large dataset with ${data.length.toLocaleString()} rows!` 
        : null
    });
    
  } catch (error) {
    console.error('❌ Parse error:', error);
    
    let errorMessage = 'Failed to parse data. ';
    
    if (error.response?.status === 413) {
      errorMessage += 'File is too large for AI processing. Please ensure your CSV is properly formatted.';
    } else if (error.message.includes('timeout')) {
      errorMessage += 'Processing took too long. Please try with a smaller file or check your connection.';
    } else {
      errorMessage += error.message;
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
});

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

    console.log('🤖 Analyzing for:', req.user.email);
    
    const validation = validateData(csvData);
    const industryType = validation.industryType;
    const rowCount = csvData.data.length;

    // ============================================
// PERFORM STATISTICAL ANALYSIS  ← NEW CODE STARTS HERE
// ============================================
console.log('🔬 Running statistical analysis...');

let statisticalResults = null;
let fintechMetrics = null;

// Detect numeric columns for analysis
const numericColumns = csvData.headers.map((header, index) => {
  const values = csvData.data.map(row => row[index]).filter(v => typeof v === 'number');
  return values.length > 0 ? { header, index, values } : null;
}).filter(Boolean);

if (numericColumns.length > 0) {
  // Analyze the first numeric column (usually revenue/amount)
  const primaryColumn = numericColumns[0];
  
  statisticalResults = {
    columnName: primaryColumn.header,
    anomalyDetection: statisticalAnalysis.detectAnomalies(primaryColumn.values),
    trendAnalysis: statisticalAnalysis.detectTrend(primaryColumn.values),
    confidenceInterval: statisticalAnalysis.calculateConfidenceInterval(primaryColumn.values),
    growthTest: statisticalAnalysis.testGrowthSignificance(primaryColumn.values),
    diagnostics: statisticalAnalysis.performDiagnostics(primaryColumn.values)
  };
  
  console.log('✅ Statistical analysis complete:', {
    anomalies: statisticalResults.anomalyDetection?.totalAnomalies || 0,
    trend: statisticalResults.trendAnalysis?.trendDirection,
    rSquared: statisticalResults.trendAnalysis?.rSquared
  });
}
    // ============================================
    // TWO-STAGE ANALYSIS: Stats + Samples
    // ============================================
    let dataContext = '';
    
    if (rowCount > 100) {
      console.log(`📊 Large dataset (${rowCount} rows) - using statistical aggregation + sampling`);
      
      // STAGE 1: Calculate comprehensive statistics (NO data loss)
      const comprehensiveStats = calculateComprehensiveStats(csvData);
      
      // STAGE 2: Extract representative samples for examples
      const samples = extractRepresentativeSamples(csvData, 60);
      
      dataContext = `
📊 COMPREHENSIVE DATASET ANALYSIS
Total Rows Analyzed: ${rowCount.toLocaleString()}
Industry Type: ${industryType}
Data Quality: ${comprehensiveStats.overview.dataQuality}

═══════════════════════════════════════
STAGE 1: COMPLETE STATISTICAL OVERVIEW
═══════════════════════════════════════

${JSON.stringify(comprehensiveStats, null, 2)}

═══════════════════════════════════════
STAGE 2: REPRESENTATIVE SAMPLES (${samples.data.length} examples)
═══════════════════════════════════════

Headers: ${samples.headers.join(' | ')}
Sample Data (showing diverse examples):
${samples.data.slice(0, 20).map(row => row.join(' | ')).join('\n')}

NOTE: You have access to COMPLETE statistics from all ${rowCount} rows above, plus specific examples below for reference.`;

    } else {
      // Small dataset - send full data
      console.log(`📊 Small dataset (${rowCount} rows) - sending complete data`);
      
      dataContext = `
Headers: ${csvData.headers.join(', ')}
Rows: ${csvData.data.length}
Industry Type: ${industryType}
Total Revenue: ₹${validation.totalRevenue.toFixed(2)}
Data Quality: ${validation.confidence}

DATA PREVIEW:
${csvData.headers.join(' | ')}
${csvData.data.slice(0, 20).map(row => row.join(' | ')).join('\n')}

FULL DATA: ${JSON.stringify(csvData)}`;
    }
    // EXPANDED EXECUTIVE REPORT FORMAT
const expandedPrompt = `You are a senior business analyst preparing an executive-level performance report for C-suite stakeholders and board members.

DATASET CONTEXT:
${dataContext}

BUSINESS QUESTION:
"${question}"

${validation.warnings.length > 0 ? 
'⚠️ DATA QUALITY WARNINGS: ' + validation.warnings.join(' | ') : ''}

${statisticalResults ? `
📊 STATISTICAL FINDINGS AVAILABLE:
${statisticalResults.trendAnalysis && parseFloat(statisticalResults.trendAnalysis.rSquared) > 0.3 ? 
  `- Trend Strength: R² = ${statisticalResults.trendAnalysis.rSquared} (${parseFloat(statisticalResults.trendAnalysis.rSquared) > 0.7 ? 'Strong' : 'Moderate'} correlation)` 
  : '- Trend: Observable pattern but not statistically strong'}
${statisticalResults.growthTest && statisticalResults.growthTest.pValue ? 
  `- Growth Significance: p-value ${statisticalResults.growthTest.pValue} (${statisticalResults.growthTest.isSignificant ? 'Statistically significant' : 'Not significant'})` 
  : ''}
- Anomalies Detected: ${statisticalResults.anomalyDetection?.totalAnomalies || 0} outliers (${statisticalResults.anomalyDetection?.percentage || 0}% of data)
${statisticalResults.confidenceInterval ? 
  `- 95% Confidence Interval: ₹${parseFloat(statisticalResults.confidenceInterval.lower).toLocaleString()} - ₹${parseFloat(statisticalResults.confidenceInterval.upper).toLocaleString()}` 
  : ''}
` : ''}

═══════════════════════════════════════════════════════════════
REPORT STRUCTURE - Follow this EXACT format:
═══════════════════════════════════════════════════════════════

📊 EXECUTIVE SUMMARY

Write 2-3 professional sentences summarizing:
- Overall business performance with key revenue/growth numbers
- Primary trend direction (improving/declining/stable)
- Most critical business insight or opportunity

Use concrete metrics in Indian Rupee format (lakhs/crores).


🔍 DETAILED ANALYSIS

1. Revenue & Financial Performance

Provide a clear paragraph discussing:
- Total revenue: ₹X (specify in lakhs/crores)
- Average per transaction/period/unit: ₹X
- Highest performing segment/period (with specific numbers)
- Lowest performing area (with specific numbers)
- Revenue distribution patterns across categories

2. Growth & Trend Analysis

Write a structured paragraph covering:
- Overall growth rate: X%
- Trend direction and consistency
${statisticalResults && parseFloat(statisticalResults.trendAnalysis?.rSquared || 0) > 0.3 ? 
  `- Statistical validation: Reference R² value to show trend reliability` 
  : '- Growth pattern based on period-over-period comparison'}
- Notable acceleration or deceleration periods
- Month-over-month or period-over-period changes

3. Key Patterns & Business Insights

Discuss in paragraph form:
- Top 3 performing products/periods/categories (with exact figures)
- Bottom 3 underperformers (with improvement potential)
- Seasonal or cyclical patterns if detected
${statisticalResults && statisticalResults.anomalyDetection?.totalAnomalies > 0 ? 
  `- Notable outliers: ${statisticalResults.anomalyDetection.totalAnomalies} data points showing unusual behavior` 
  : ''}
- Emerging trends or correlations worth noting

4. ${industryType === 'fintech' ? 'FinTech Performance Metrics' : 
     industryType === 'marketing' ? 'Marketing Campaign Metrics' : 
     industryType === 'ecommerce' ? 'E-commerce Performance Metrics' : 
     industryType === 'saas' ? 'SaaS Business Metrics' :
     'Industry-Specific Metrics'}

${industryType === 'fintech' ? 
  'Analyze: Monthly Active Users (MAU), Average Revenue Per User (ARPU), Transaction Volume, Customer Retention Rate, Churn Rate' :
  industryType === 'marketing' ? 
  'Analyze: Conversion Rate, Click-Through Rate (CTR), Cost Per Acquisition (CPA), Return on Ad Spend (ROAS), Campaign Performance' :
  industryType === 'ecommerce' ? 
  'Analyze: Average Order Value (AOV), Cart Abandonment Rate, Product Performance, Customer Lifetime Value (CLV), Repeat Purchase Rate' :
  industryType === 'saas' ? 
  'Analyze: Monthly Recurring Revenue (MRR), Customer Acquisition Cost (CAC), Churn Rate, Net Revenue Retention (NRR), Customer Lifetime Value' :
  'Analyze key performance indicators relevant to your business model with actual data points'}


🎯 STRATEGIC RECOMMENDATIONS

Priority 1: [Most Critical Action]
- What to do: [Specific, actionable step]
- Business rationale: [Data-driven reason with supporting numbers]
- Expected impact: [Quantified outcome - "Could increase revenue by X%" or "May improve metric Y by Z%"]
- Implementation timeline: [Immediate/This Month/This Quarter]

Priority 2: [Important Secondary Action]
- What to do: [Specific recommendation]
- Business rationale: [Evidence from analysis]
- Expected impact: [Measurable outcome with ₹ or % estimate]
- Implementation timeline: [When to execute]

Priority 3: [Strategic Long-term Action]
- What to do: [Forward-looking recommendation]
- Business rationale: [Trend-based reasoning]
- Expected impact: [Projected result]
- Implementation timeline: [Planning horizon]


⚠️ RISKS & CONSIDERATIONS

List 2-3 key risks or challenges:
- Business execution risks based on current data patterns
- Market or operational challenges visible in the data
- Data quality concerns: ${statisticalResults?.diagnostics?.dataQuality !== 'Good' ? 
    `Data quality rated as ${statisticalResults.diagnostics.dataQuality} - consider validation` 
    : 'Data quality is good'}


📋 ASSUMPTIONS & LIMITATIONS

Clearly state:
- Data scope: ${validation.rowCount} records analyzed (${validation.rowCount >= 1000 ? 'Statistically robust sample' : 'Limited sample size - interpret with caution'})
- Time period covered: [Extract from data]
- Key assumptions made in the analysis
- External factors not considered (market conditions, seasonality, competition)
- Confidence level in recommendations: ${parseFloat(statisticalResults?.trendAnalysis?.rSquared || 0) > 0.7 ? 'High (strong statistical support)' : 
  parseFloat(statisticalResults?.trendAnalysis?.rSquared || 0) > 0.4 ? 'Moderate (observable trends)' : 
  'Limited (directional insights only)'}


💡 ACTIONABLE NEXT STEPS

1. Immediate (This Week): [Urgent action item]
2. Short-term (This Month): [Important follow-up]
3. Strategic (This Quarter): [Long-term initiative]


📈 FORECASTING & PROJECTIONS

${statisticalResults && parseFloat(statisticalResults.trendAnalysis?.rSquared || 0) > 0.5 ? 
  `Based on statistically significant trend analysis (R² = ${statisticalResults.trendAnalysis.rSquared}):

FORECAST:
- Projected next period performance: [Provide estimate]
- 95% Confidence Range: ₹${parseFloat(statisticalResults.confidenceInterval?.lower || 0).toLocaleString()} - ₹${parseFloat(statisticalResults.confidenceInterval?.upper || 0).toLocaleString()}
- Forecast confidence: High (supported by strong historical correlation)

FORECAST ASSUMPTIONS:
- Current business trajectory continues without major disruptions
- Market conditions remain relatively stable
- No significant competitive or regulatory changes
- Historical patterns continue to apply

⚠️ USE WITH CAUTION: Forecasts are probabilistic estimates, not guarantees. Monitor actual performance and adjust strategy accordingly.`
  :
  `⚠️ FORECASTING NOT RECOMMENDED

Current data shows ${statisticalResults?.trendAnalysis?.trendDirection || 'variable'} patterns but lacks statistical confidence for reliable forecasting${statisticalResults?.trendAnalysis?.rSquared ? ` (R² = ${statisticalResults.trendAnalysis.rSquared})` : ''}.

DIRECTIONAL GUIDANCE:
- Recent trend suggests ${statisticalResults?.trendAnalysis?.trendDirection || 'mixed'} movement
- Recommend: Collect more data points before making projection-based decisions
- Alternative: Use scenario planning (best case / base case / worst case) instead of single-point forecasts

Focus on near-term actions rather than long-range predictions.`}


═══════════════════════════════════════════════════════════════
WRITING GUIDELINES (CRITICAL):
═══════════════════════════════════════════════════════════════

✅ TONE & STYLE:
- Write for C-suite executives (CEO, CFO, COO level)
- Professional, confident, decision-oriented language
- Avoid unnecessary technical jargon
- Use emojis ONLY for section headers, not within analysis text
- Balance data rigor with business accessibility

✅ NUMERICAL PRECISION:
- Always use Indian Rupee format (₹ lakhs/crores)
- Include percentages with one decimal place (X.X%)
- Round large numbers appropriately (₹45.6 lakhs, not ₹4,563,247)
- Compare numbers to averages, benchmarks, or prior periods for context

✅ STRUCTURE:
- Executive Summary: Flowing prose (2-3 sentences, no bullets)
- Analysis sections: Clear paragraphs with embedded data points
- Recommendations: Structured bullet format (What/Why/Impact/Timeline)
- Avoid bullet points except in Recommendations, Risks, and Next Steps

✅ DATA INTEGRITY:
- Only cite statistical measures when they exist and are meaningful
- Never fabricate numbers - use "not available" if data is missing
- Acknowledge data limitations transparently
- Provide confidence levels for predictions

✅ BUSINESS IMPACT:
- Every insight must connect to business value (revenue, cost, risk, growth)
- Recommendations must be specific and implementable
- Quantify expected outcomes wherever possible
- Consider feasibility and resource requirements


═══════════════════════════════════════════════════════════════
CRITICAL SUCCESS FACTORS:
═══════════════════════════════════════════════════════════════

This report will be presented to senior leadership and potentially external stakeholders (board members, investors, partners).

Ensure:
1. Every claim is supported by data from the dataset
2. Recommendations are practical and defensible
3. Risks and limitations are stated upfront
4. Language is professional and presentation-ready
5. Report can stand up to executive questioning

Deliver analysis that drives business decisions, not just describes data.
`;

const answer = await callGroqAPI([
  { role: 'system', content: 'You are a senior business analyst creating comprehensive executive reports. Follow the format exactly and provide detailed, data-driven insights.' },
  { role: 'user', content: expandedPrompt }
]);
// ✅ ADD THESE LINES:
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
    industryType: industryType,
    metrics: {
      dataPoints: validation.rowCount,
      timeRange: `${csvData.data.length} records`
    }
  });
}

console.log('✅ [ANALYZE] Analysis complete - response length:', answer.length);
console.log('📊 [ANALYZE] ==================== REQUEST COMPLETE ====================');

res.json({ 
  success: true,
  type: responseType, 
  content: cleanedAnswer, 
  chartData,
  confidence: validation.confidence,
  industryType: industryType,
  statistics: statisticalResults,
  fintechMetrics: fintechMetrics,
  metadata: {
    totalRevenue: validation.totalRevenue,
    rowCount: validation.rowCount,
    warnings: validation.warnings
  }
});
  } catch (error) {
    console.error('❌ [ANALYZE] Analysis failed!');
    console.error('❌ [ANALYZE] Error type:', error.name);
    console.error('❌ [ANALYZE] Error message:', error.message);
    console.error('❌ [ANALYZE] Stack trace:', error.stack);
    
    handleError(res, error, 'Failed to analyze data. Please try again.');
  }
});

// Other routes (save-analysis, history, comparison, etc.) - keep as is from original
app.post('/api/save-analysis', verifyToken, async (req, res) => {
  try {
    const { rawData, csvData, analysis, dataType, tags, originalRowCount, isSampled } = req.body;
    
    // ============================================
    // MONGODB SIZE PROTECTION
    // MongoDB has 16MB document limit
    // ============================================
    const estimatedSize = JSON.stringify(req.body).length;
    console.log(`💾 Saving analysis - Estimated size: ${(estimatedSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (estimatedSize > 15 * 1024 * 1024) { // 15MB safety threshold
      console.error('❌ Document too large for MongoDB');
      return res.json({
        success: false,
        error: 'Dataset too large to save in history. Analysis completed successfully but not saved to history.'
      });
    }
    
    const newAnalysis = new Analysis({
      userId: req.user.uid,
      userEmail: req.user.email,
      userName: req.user.name,
      rawData: rawData.substring(0, 50000), // Trim to 50KB max
      csvData,
      analysis,
      dataType: dataType || 'business',
      tags: tags || ['auto-saved'],
      questions: [],
      metadata: {
        originalRowCount: originalRowCount || csvData?.data?.length || 0,
        isSampled: isSampled || false,
        savedAt: new Date()
      }
    });
    await newAnalysis.save();
    console.log('✅ Analysis saved:', newAnalysis._id);
    res.json({
      success: true,
      message: 'Analysis saved successfully',
      analysisId: newAnalysis._id
    });
  } catch (error) {
    handleError(res, error, 'Failed to save analysis');
  }
});

app.get('/api/analysis-history', verifyToken, requireMongoDB, async (req, res) => {
  try {
    // ✅ SECURE: Sanitize and validate inputs
    const rawLimit = req.query.limit;
    const rawDataType = req.query.dataType;
    
    // Validate limit (integer between 1-100)
    const limit = Math.min(Math.max(parseInt(rawLimit) || 10, 1), 100);
    
    // Sanitize and validate dataType
    const sanitizedDataType = sanitizeMongoInput(rawDataType);
    const dataType = validateDataType(sanitizedDataType);
    
    // Build query safely
    const query = { userId: req.user.uid };
    if (dataType) {
      query.dataType = dataType;
    }
    
    console.log('📊 Fetching history:', { userId: req.user.uid, limit, dataType });
    const analyses = await Analysis.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-rawData -csvData.data');
    res.json({ success: true, count: analyses.length, analyses });
  } catch (error) {
    handleError(res, error, 'Failed to retrieve history');
  }
});

app.get('/api/analysis/:id', verifyToken, requireMongoDB, async (req, res) => {
  try {
    // ✅ SECURE: Validate ObjectId format
    const { id } = req.params;
    
    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid analysis ID format' 
      });
    }
    
    const analysis = await Analysis.findOne({
      _id: id,
      userId: req.user.uid
    });
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    res.json({ success: true, analysis });
  } catch (error) {
    handleError(res, error, 'Failed to retrieve analysis');
  }
});

// ============================================
// SMART COMPARISON ENDPOINT - Only compares same industry sectors
// ============================================

app.post('/api/compare-analysis', verifyToken, requireMongoDB, async (req, res) => {
  try {
    // ✅ SECURE: Validate request body
    const { currentMetrics, dataType, currentIndustry } = req.body;
    
    if (!currentMetrics || typeof currentMetrics !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid metrics data' 
      });
    }
    
    // Sanitize industry type
    const sanitizedIndustry = sanitizeMongoInput(currentIndustry);
    const validIndustry = validateDataType(sanitizedIndustry) || 'business';
    
    console.log('📊 Fetching historical data for comparison...');
    console.log('🏭 Current Industry:', validIndustry);
    
    if (!currentMetrics) {
      return res.status(400).json({ success: false, error: 'Missing current metrics' });
    }

    console.log('📊 Fetching historical data for comparison...');
    console.log('🏭 Current Industry:', currentIndustry || 'unknown');
    
    // Get ALL past analyses
    const allPastAnalyses = await Analysis.find({ 
      userId: req.user.uid 
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .select('analysis.metrics industryType timestamp');

    if (allPastAnalyses.length === 0) {
      console.log('ℹ️ No historical data found for comparison');
      return res.json({
        success: true,
        comparison: {
          hasHistory: false,
          message: 'This is your first analysis. Future analyses will show comparisons!',
          firstTime: true
        }
      });
    }

    console.log(`✅ Found ${allPastAnalyses.length} total past analyses`);

    // ============================================
    // SMART FILTERING: Only compare SAME industry
    // ============================================
    const sameIndustryAnalyses = allPastAnalyses.filter(a => 
      a.industryType === currentIndustry
    );

    const differentIndustryAnalyses = allPastAnalyses.filter(a => 
      a.industryType !== currentIndustry
    );

    console.log(`📊 Same industry (${currentIndustry}): ${sameIndustryAnalyses.length} analyses`);
    console.log(`📊 Different industries: ${differentIndustryAnalyses.length} analyses`);

    // Count analyses by industry
    const industryBreakdown = allPastAnalyses.reduce((acc, analysis) => {
      const industry = analysis.industryType || 'unknown';
      if (!acc[industry]) {
        acc[industry] = { count: 0, avgRevenue: 0, analyses: [] };
      }
      acc[industry].count++;
      acc[industry].analyses.push(analysis);
      return acc;
    }, {});

    // Calculate average revenue per industry
    Object.keys(industryBreakdown).forEach(industry => {
      const analyses = industryBreakdown[industry].analyses;
      const validAnalyses = analyses.filter(a => a.analysis?.metrics?.totalRevenue);
      if (validAnalyses.length > 0) {
        industryBreakdown[industry].avgRevenue = 
          validAnalyses.reduce((sum, a) => sum + a.analysis.metrics.totalRevenue, 0) / validAnalyses.length;
      }
    });

    // ============================================
    // CASE 1: NO SAME-INDUSTRY DATA FOUND
    // ============================================
    if (sameIndustryAnalyses.length === 0) {
      console.log('⚠️ No same-industry data found for comparison');
      
      const warningMessage = `⚠️ **Comparison Not Possible**

I found ${differentIndustryAnalyses.length} past analysis/analyses, but they're from different industries:
${Object.entries(industryBreakdown)
  .filter(([industry]) => industry !== currentIndustry)
  .map(([industry, data]) => `• ${industry.toUpperCase()}: ${data.count} analysis/analyses`)
  .join('\n')}

**Why can't I compare?**
You're currently analyzing **${currentIndustry.toUpperCase()}** data, but your previous data is from different sectors. Comparing e-commerce with banking, or fintech with retail would give misleading insights because:

1. Different revenue models (products vs services vs transactions)
2. Different metrics (units sold vs active users vs conversions)
3. Different market dynamics and growth patterns
4. Different seasonal trends and business cycles

**What you should do:**
Analyze more **${currentIndustry.toUpperCase()}** datasets to enable meaningful comparisons. Once you have 2+ analyses from the same industry, I'll show you:
- Revenue trends over time
- Growth rate improvements
- Performance benchmarks
- Actionable recommendations

**Your historical data:**
${Object.entries(industryBreakdown).map(([industry, data]) => 
  `• ${industry}: ${data.count} analyses, Avg Revenue: ₹${(data.avgRevenue / 100000).toFixed(2)} lakhs`
).join('\n')}`;

      return res.json({
        success: true,
        comparison: {
          hasHistory: true,
          canCompare: false,
          currentIndustry: currentIndustry,
          sameIndustryCount: 0,
          differentIndustryCount: differentIndustryAnalyses.length,
          industryBreakdown: Object.entries(industryBreakdown).map(([industry, data]) => ({
            industry: industry,
            count: data.count,
            avgRevenue: Math.round(data.avgRevenue)
          })),
          warningMessage: warningMessage,
          aiInsight: warningMessage
        }
      });
    }

    // ============================================
    // CASE 2: SAME-INDUSTRY DATA FOUND - DO COMPARISON
    // ============================================
    console.log(`✅ Comparing with ${sameIndustryAnalyses.length} same-industry analyses`);

    const validSameIndustryMetrics = sameIndustryAnalyses
      .filter(a => a.analysis?.metrics?.totalRevenue)
      .map(a => a.analysis.metrics);

    if (validSameIndustryMetrics.length === 0) {
      return res.json({
        success: true,
        comparison: {
          hasHistory: true,
          canCompare: false,
          message: 'No valid metrics found in same-industry analyses'
        }
      });
    }

    // Calculate averages from SAME INDUSTRY data only
    const avgPastRevenue = validSameIndustryMetrics.reduce((sum, m) => sum + (m.totalRevenue || 0), 0) / validSameIndustryMetrics.length;
    const avgPastGrowth = validSameIndustryMetrics.reduce((sum, m) => sum + (m.growthRate || 0), 0) / validSameIndustryMetrics.length;
    const avgPastDataPoints = validSameIndustryMetrics.reduce((sum, m) => sum + (m.dataPoints || 0), 0) / validSameIndustryMetrics.length;

    // Calculate percentage changes
    const revenueChange = avgPastRevenue !== 0 
      ? (((currentMetrics.totalRevenue - avgPastRevenue) / avgPastRevenue) * 100).toFixed(2)
      : 0;
    
    const growthChange = avgPastGrowth !== 0
      ? (((currentMetrics.growthRate - avgPastGrowth) / Math.abs(avgPastGrowth)) * 100).toFixed(2)
      : 0;

    // Determine trend
    const trend = parseFloat(revenueChange) > 5 ? 'improving' : 
                  parseFloat(revenueChange) < -5 ? 'declining' : 'stable';

    // Generate AI insight for SAME INDUSTRY comparison
    const comparisonPrompt = `As a ${currentIndustry} business analyst, analyze this SAME-INDUSTRY performance comparison:

**CURRENT ${currentIndustry.toUpperCase()} PERFORMANCE:**
- Total Revenue: ₹${currentMetrics.totalRevenue.toLocaleString()} (₹${(currentMetrics.totalRevenue / 100000).toFixed(2)} lakhs)
- Growth Rate: ${currentMetrics.growthRate.toFixed(2)}%
- Data Points: ${currentMetrics.dataPoints}

**HISTORICAL ${currentIndustry.toUpperCase()} AVERAGE (Last ${validSameIndustryMetrics.length} analyses):**
- Average Revenue: ₹${avgPastRevenue.toLocaleString()} (₹${(avgPastRevenue / 100000).toFixed(2)} lakhs)
- Average Growth: ${avgPastGrowth.toFixed(2)}%
- Average Data Points: ${Math.round(avgPastDataPoints)}

**CHANGES:**
- Revenue Change: ${revenueChange}% ${parseFloat(revenueChange) > 0 ? '📈 UP' : '📉 DOWN'}
- Growth Change: ${growthChange}%
- Trend: ${trend.toUpperCase()}

${differentIndustryAnalyses.length > 0 ? `
**NOTE:** I found ${differentIndustryAnalyses.length} analyses from other industries (${[...new Set(differentIndustryAnalyses.map(a => a.industryType))].join(', ')}), but I'm ONLY comparing with same-industry (${currentIndustry}) data for accuracy.
` : ''}

Provide a CONCISE ${currentIndustry}-specific insight (3-4 sentences max):
1. Highlight the most significant change
2. Compare against ${currentIndustry} industry benchmarks
3. Give ONE actionable ${currentIndustry}-specific recommendation

Use Indian Rupee lakhs/crores format. Be direct and specific to ${currentIndustry} business.`;

    let aiInsight = '';
    try {
      aiInsight = await callGroqAPI([
        { role: 'system', content: `You are a ${currentIndustry} industry analyst. Focus on ${currentIndustry}-specific insights only.` },
        { role: 'user', content: comparisonPrompt }
      ]);
      console.log('✅ AI comparison insight generated');
    } catch (error) {
      console.error('⚠️ AI insight generation failed:', error.message);
      const revChange = parseFloat(revenueChange);
      aiInsight = `Your ${currentIndustry} revenue is ${trend} with a ${Math.abs(revChange)}% ${revChange > 0 ? 'increase' : 'decrease'} compared to your historical ${currentIndustry} average of ₹${(avgPastRevenue / 100000).toFixed(2)} lakhs. ${revChange > 0 ? 'Great progress! Keep focusing on what\'s working.' : 'Consider reviewing your strategy and learning from your better-performing periods.'}`;
    }

    // Add industry context to the insight
    const contextualInsight = differentIndustryAnalyses.length > 0 
      ? `✅ **Comparing ${currentIndustry.toUpperCase()} data only** (${sameIndustryAnalyses.length} past analyses)\n\n${aiInsight}\n\n📊 *Note: I found ${differentIndustryAnalyses.length} analyses from other industries but excluded them for accurate comparison.*`
      : `✅ **${currentIndustry.toUpperCase()} Performance Analysis** (${sameIndustryAnalyses.length} past analyses)\n\n${aiInsight}`;

    const comparisonResult = {
      hasHistory: true,
      canCompare: true,
      currentIndustry: currentIndustry,
      sameIndustryCount: sameIndustryAnalyses.length,
      differentIndustryCount: differentIndustryAnalyses.length,
      trend: trend,
      pastAnalysesCount: validSameIndustryMetrics.length,
      metrics: {
        current: {
          totalRevenue: currentMetrics.totalRevenue,
          growthRate: currentMetrics.growthRate,
          dataPoints: currentMetrics.dataPoints
        },
        pastAverage: {
          totalRevenue: Math.round(avgPastRevenue),
          growthRate: parseFloat(avgPastGrowth.toFixed(2)),
          dataPoints: Math.round(avgPastDataPoints)
        },
        changes: {
          revenueChange: revenueChange,
          growthChange: growthChange
        }
      },
      industryBreakdown: Object.entries(industryBreakdown).map(([industry, data]) => ({
        industry: industry,
        count: data.count,
        avgRevenue: Math.round(data.avgRevenue),
        isCurrent: industry === currentIndustry
      })),
      aiInsight: contextualInsight
    };

    console.log('✅ Same-industry comparison complete');
    console.log(`📈 ${currentIndustry} Trend: ${trend}, Revenue Change: ${revenueChange}%`);
    if (differentIndustryAnalyses.length > 0) {
      console.log(`ℹ️ Excluded ${differentIndustryAnalyses.length} different-industry analyses`);
    }

    res.json({
      success: true,
      comparison: comparisonResult
    });

  } catch (error) {
    handleError(res, error, 'Failed to generate comparison');
  }
});

// Serve React Frontend (works in all environments)
const buildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(buildPath)) {
  console.log('📦 Serving frontend from:', buildPath);
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
} else {
  console.log('⚠️ Frontend build folder not found. Run: cd frontend && npm run build');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 InsightAI Backend - Universal Analytics Platform`);
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Disconnected'}`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async () => {
  console.log('👋 Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
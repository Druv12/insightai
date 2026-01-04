const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  
  // Original data
  rawData: {
    type: String,
    required: true
  },
  
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
    },
    insights: [String],
    recommendations: [String]
  },
  
  // Questions asked by user
  questions: [{
    question: String,
    answer: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  dataType: {
    type: String,
    enum: ['sales', 'revenue', 'customer', 'inventory', 'other'],
    default: 'other'
  },
  
  tags: [String],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
AnalysisSchema.index({ userId: 1, createdAt: -1 });
AnalysisSchema.index({ userId: 1, dataType: 1 });

module.exports = mongoose.model('Analysis', AnalysisSchema);
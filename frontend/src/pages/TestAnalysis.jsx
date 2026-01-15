import React, { useState } from 'react';
import AnalysisResults from '../components/AnalysisResults';

function TestAnalysis() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('What are the key trends?');

  const runTest = async () => {
    setLoading(true);
    
    const testData = {
      question: question,
      csvData: {
        headers: ["Month", "Product", "Revenue"],
        data: [
          ["January", "Mobile", 50000],
          ["February", "Mobile", 60000],
          ["March", "Mobile", 70000],
          ["April", "Mobile", 65000],
          ["May", "Mobile", 80000]
        ]
      }
    };

    try {
      const response = await fetch('https://insightais.onrender.com/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      console.log('API Response:', data);
      setAnalysisData(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '12px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
            🧪 InsightAI - Schema-Aware Analysis Test
          </h1>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Question:
            </label>
            <input 
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px'
              }}
            />
          </div>

          <button 
            onClick={runTest}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#6366f1',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '⏳ Analyzing...' : '🔍 Run Analysis'}
          </button>

          <div style={{ 
            marginTop: '20px',
            padding: '15px',
            background: '#f3f4f6',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <strong>Test Data:</strong> 5 rows of revenue data (Month, Product, Revenue)
            <br />
            <strong>Expected:</strong> Revenue metrics calculated, NO user metrics (no user_id column)
          </div>
        </div>

        {analysisData && <AnalysisResults analysisData={analysisData} />}
      </div>
    </div>
  );
}

export default TestAnalysis;
import React, { useState } from 'react';
import { Code, Database, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SQL Logic Display Component
 * Shows SQL equivalent of metric calculations
 * Add this to App.js as a new component
 */
const SQLLogicDisplay = ({ csvData, metrics }) => {
  const [showSQL, setShowSQL] = useState(false);
  
  if (!csvData || !metrics) return null;
  
  // Detect column names
  const revenueCol = csvData.headers.find(h => 
    h.toLowerCase().includes('revenue') || 
    h.toLowerCase().includes('sales') || 
    h.toLowerCase().includes('amount')
  ) || 'revenue';
  
  const dateCol = csvData.headers.find(h => 
    h.toLowerCase().includes('date') || 
    h.toLowerCase().includes('month')
  ) || 'date';
  
  const userCol = csvData.headers.find(h => 
    h.toLowerCase().includes('user') || 
    h.toLowerCase().includes('customer')
  ) || 'user_id';
  
  const productCol = csvData.headers.find(h => 
    h.toLowerCase().includes('product')
  ) || 'product';
  
  const channelCol = csvData.headers.find(h => 
    h.toLowerCase().includes('channel') || 
    h.toLowerCase().includes('source')
  ) || 'channel';

  const sqlQueries = [
    {
      title: 'Total Revenue Calculation',
      sql: `-- Calculate total revenue
SELECT 
  SUM(${revenueCol}) AS total_revenue,
  AVG(${revenueCol}) AS avg_revenue,
  MAX(${revenueCol}) AS max_revenue,
  MIN(${revenueCol}) AS min_revenue,
  COUNT(*) AS total_transactions
FROM transactions;`,
      result: `Total Revenue: ₹${metrics.totalRevenue.toLocaleString()}`
    },
    {
      title: 'Month-over-Month Growth',
      sql: `-- Calculate monthly revenue growth
WITH monthly_revenue AS (
  SELECT 
    DATE_TRUNC('month', ${dateCol}) AS month,
    SUM(${revenueCol}) AS revenue
  FROM transactions
  GROUP BY month
  ORDER BY month
),
growth AS (
  SELECT 
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
    ((revenue - LAG(revenue) OVER (ORDER BY month)) / 
     LAG(revenue) OVER (ORDER BY month)) * 100 AS growth_rate
  FROM monthly_revenue
)
SELECT * FROM growth;`,
      result: `Growth Rate: ${metrics.growthRate.toFixed(2)}%`
    }
  ];
  
  // Add user-level queries if user column exists
  if (csvData.headers.some(h => h.toLowerCase().includes('user'))) {
    sqlQueries.push({
      title: 'ARPU (Average Revenue Per User)',
      sql: `-- Calculate average revenue per user
SELECT 
  SUM(${revenueCol}) / COUNT(DISTINCT ${userCol}) AS arpu,
  COUNT(DISTINCT ${userCol}) AS total_users,
  SUM(${revenueCol}) AS total_revenue
FROM transactions;`,
      result: `ARPU: ₹${(metrics.totalRevenue / metrics.dataPoints).toFixed(2)}`
    });
  }
  
  // Add channel analysis if channel column exists
  if (csvData.headers.some(h => h.toLowerCase().includes('channel'))) {
    sqlQueries.push({
      title: 'Channel Performance Analysis',
      sql: `-- Analyze performance by channel
SELECT 
  ${channelCol} AS channel,
  COUNT(*) AS transactions,
  SUM(${revenueCol}) AS total_revenue,
  AVG(${revenueCol}) AS avg_transaction_value,
  (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()) AS percentage_of_total
FROM transactions
GROUP BY ${channelCol}
ORDER BY total_revenue DESC;`,
      result: 'See Channel Distribution in charts above'
    });
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      borderRadius: '20px',
      padding: '30px',
      marginBottom: '20px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <div 
        onClick={() => setShowSQL(!showSQL)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: showSQL ? '20px' : '0'
        }}
      >
        <h2 style={{ 
          color: '#1e3a8a', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Database size={28} />
          SQL Logic & Metric Calculations
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ 
            color: '#6b7280',
            fontSize: '0.9em',
            fontWeight: 'bold'
          }}>
            {showSQL ? 'Hide' : 'Show'} SQL Queries
          </span>
          {showSQL ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </div>
      
      {showSQL && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            background: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '15px',
            fontSize: '0.95em',
            color: '#1e40af'
          }}>
            <strong>📊 How Metrics Are Calculated:</strong> Below are the SQL queries that represent the logic used to calculate your metrics. Even though the backend uses JavaScript/Python, this shows the analytical thinking behind each metric.
          </div>
          
          {sqlQueries.map((query, index) => (
            <div 
              key={index}
              style={{
                background: '#1e1e1e',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid #374151'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                color: '#10b981',
                fontWeight: 'bold',
                fontSize: '1.1em'
              }}>
                <Code size={20} />
                {query.title}
              </div>
              
              <pre style={{
                background: '#0d1117',
                padding: '15px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.9em',
                color: '#e6edf3',
                margin: '0 0 15px 0',
                border: '1px solid #30363d'
              }}>
                <code>{query.sql}</code>
              </pre>
              
              <div style={{
                background: '#065f46',
                color: '#d1fae5',
                padding: '10px 15px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.95em'
              }}>
                ✓ Result: {query.result}
              </div>
            </div>
          ))}
          
          <div style={{
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '15px',
            fontSize: '0.9em',
            color: '#92400e'
          }}>
            <strong>💡 Why This Matters:</strong> Understanding SQL logic demonstrates:
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
              <li>How data is aggregated and grouped</li>
              <li>Window functions for growth calculations</li>
              <li>Multi-table thinking (even with single dataset)</li>
              <li>Industry-standard metric definitions</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SQLLogicDisplay;
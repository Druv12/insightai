import React, { useState } from 'react';
import './AnalysisResults.css';

const AnalysisResults = ({ analysisData }) => {
  const [showMetrics, setShowMetrics] = useState(false);
  const [showSQLDocs, setShowSQLDocs] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  if (!analysisData) return null;

  return (
    <div className="analysis-results">
      
      {/* Main Analysis Result */}
      <div className="result-card">
        <h2>📈 Analysis Result</h2>
        <div className="result-content">
          {analysisData.content}
        </div>
      </div>

      {/* Analysis Summary Card */}
      {analysisData.metadata && (
        <div className="info-card">
          <h3 className="info-title">📊 Analysis Summary</h3>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Rows Analyzed:</span>
              <span className="info-value">
                {analysisData.metadata.totalRows?.toLocaleString()}
              </span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Metrics Calculated:</span>
              <span className="info-value">
                {analysisData.metadata.availableMetricsCount}
              </span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Columns Used:</span>
              <span className="info-value">
                {analysisData.metadata.columnsAnalyzed}
              </span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Confidence:</span>
              <span className="info-value">
                {(analysisData.confidence * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Industry:</span>
              <span className="info-value">
                {analysisData.industryType}
              </span>
            </div>
          </div>

          {/* Data Limitations Warning */}
          {analysisData.metadata.missingMetrics?.length > 0 && (
            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <h4>Data Limitations</h4>
                <p>
                  {analysisData.metadata.missingMetrics.length} metric(s) unavailable 
                  due to missing columns
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Available Metrics Section */}
      {analysisData.metrics && Object.keys(analysisData.metrics).length > 0 && (
        <div className="expandable-section">
          <button 
            className="toggle-button"
            onClick={() => setShowMetrics(!showMetrics)}
          >
            <span className="toggle-icon">{showMetrics ? '▼' : '▶'}</span>
            <span className="toggle-text">
              Available Metrics ({Object.keys(analysisData.metrics).length})
            </span>
          </button>

          {showMetrics && (
            <div className="metrics-card">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analysisData.metrics).map(([key, value]) => {
                    let displayValue;
                    if (typeof value === 'number') {
                      displayValue = value.toLocaleString('en-IN', {
                        maximumFractionDigits: 2
                      });
                    } else if (typeof value === 'object') {
                      displayValue = JSON.stringify(value, null, 2);
                    } else {
                      displayValue = String(value);
                    }

                    return (
                      <tr key={key}>
                        <td className="metric-label">{key}</td>
                        <td className="metric-value">{displayValue}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schema Detection Section */}
      {analysisData.availableColumns && (
        <div className="expandable-section">
          <button 
            className="toggle-button"
            onClick={() => setShowColumns(!showColumns)}
          >
            <span className="toggle-icon">{showColumns ? '▼' : '▶'}</span>
            <span className="toggle-text">Schema Detection</span>
          </button>

          {showColumns && (
            <div className="columns-card">
              <div className="columns-section">
                <h4 className="columns-heading available">✅ Available Columns</h4>
                <ul className="columns-list">
                  {Object.entries(analysisData.availableColumns)
                    .filter(([key, value]) => value === true)
                    .map(([key]) => (
                      <li key={key} className="column-item available">
                        {key}
                      </li>
                    ))}
                </ul>
              </div>

              <div className="columns-section">
                <h4 className="columns-heading missing">❌ Missing Columns</h4>
                <ul className="columns-list">
                  {Object.entries(analysisData.availableColumns)
                    .filter(([key, value]) => value === false)
                    .map(([key]) => (
                      <li key={key} className="column-item missing">
                        {key}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SQL Documentation Section */}
      {analysisData.sqlDocumentation && (
        <div className="expandable-section">
          <button 
            className="toggle-button sql"
            onClick={() => setShowSQLDocs(!showSQLDocs)}
          >
            <span className="toggle-icon">{showSQLDocs ? '▼' : '▶'}</span>
            <span className="toggle-text">
              SQL Query Logic (For Interviews 💼)
            </span>
          </button>

          {showSQLDocs && (
            <div className="sql-card">
              <pre className="sql-content">
                <code>{analysisData.sqlDocumentation}</code>
              </pre>
              <div className="sql-hint">
                💡 This shows how metrics are calculated - perfect for technical interviews!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistical Analysis Section */}
      {analysisData.statistics && (
        <div className="stats-card">
          <h3 className="stats-title">📊 Statistical Analysis</h3>
          
          <div className="stats-grid">
            {analysisData.statistics.trendAnalysis && (
              <div className="stat-item">
                <span className="stat-label">📈 Trend:</span>
                <span className="stat-value">
                  {analysisData.statistics.trendAnalysis.trendDirection} 
                  (R² = {analysisData.statistics.trendAnalysis.rSquared})
                </span>
              </div>
            )}
            
            {analysisData.statistics.anomalyDetection && (
              <div className="stat-item">
                <span className="stat-label">⚠️ Anomalies:</span>
                <span className="stat-value">
                  {analysisData.statistics.anomalyDetection.totalAnomalies} outliers detected
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalysisResults;
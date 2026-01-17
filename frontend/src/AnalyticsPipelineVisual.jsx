import React from 'react';
import { Upload, CheckCircle, Cpu, BarChart3, Lightbulb, TrendingUp } from 'lucide-react';

/**
 * Analytics Pipeline Visualization Component
 * Shows the step-by-step data processing flow
 * Add this to App.js to display the analytics lifecycle
 */
const AnalyticsPipelineVisual = ({ currentStep }) => {
  const steps = [
    {
      id: 1,
      name: 'Raw Data Upload',
      icon: <Upload size={24} />,
      description: 'CSV, Excel, or text data ingestion',
      color: '#3b82f6'
    },
    {
      id: 2,
      name: 'Data Validation',
      icon: <CheckCircle size={24} />,
      description: 'Schema detection, quality checks, anomaly detection',
      color: '#10b981'
    },
    {
      id: 3,
      name: 'Feature Engineering',
      icon: <Cpu size={24} />,
      description: 'Column identification, metric feasibility analysis',
      color: '#8b5cf6'
    },
    {
      id: 4,
      name: 'Metric Calculation',
      icon: <BarChart3 size={24} />,
      description: 'Revenue, growth, ARPU, retention (schema-aware)',
      color: '#f59e0b'
    },
    {
      id: 5,
      name: 'Insight Generation',
      icon: <Lightbulb size={24} />,
      description: 'AI-powered pattern recognition and trend analysis',
      color: '#ec4899'
    },
    {
      id: 6,
      name: 'Business Recommendations',
      icon: <TrendingUp size={24} />,
      description: 'Actionable strategies and next steps',
      color: '#06b6d4'
    }
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      borderRadius: '20px',
      padding: '30px',
      marginBottom: '20px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <h2 style={{ 
        color: '#1e3a8a', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        🔄 InsightAI Analytics Pipeline
      </h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {steps.map((step, index) => {
          const isActive = currentStep >= step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div 
              key={step.id}
              style={{
                background: isActive ? `linear-gradient(135deg, ${step.color}15, ${step.color}05)` : '#f9fafb',
                border: `3px solid ${isActive ? step.color : '#e5e7eb'}`,
                borderRadius: '15px',
                padding: '20px',
                position: 'relative',
                transition: 'all 0.3s',
                opacity: isActive ? 1 : 0.6,
                transform: isCurrent ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {/* Step number badge */}
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '20px',
                background: isActive ? step.color : '#9ca3af',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {step.id}
              </div>
              
              {/* Icon and title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
                color: isActive ? step.color : '#6b7280'
              }}>
                <div style={{
                  padding: '8px',
                  background: isActive ? `${step.color}20` : '#f3f4f6',
                  borderRadius: '10px'
                }}>
                  {step.icon}
                </div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.1em',
                  fontWeight: 'bold'
                }}>
                  {step.name}
                </h3>
              </div>
              
              {/* Description */}
              <p style={{ 
                margin: 0, 
                color: '#6b7280',
                fontSize: '0.9em',
                lineHeight: '1.5'
              }}>
                {step.description}
              </p>
              
              {/* Active indicator */}
              {isCurrent && (
                <div style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  background: `${step.color}20`,
                  color: step.color,
                  borderRadius: '6px',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  ⚡ Currently Processing
                </div>
              )}
              
              {/* Completed indicator */}
              {isActive && !isCurrent && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: step.color,
                  fontSize: '0.85em',
                  fontWeight: 'bold'
                }}>
                  <CheckCircle size={16} />
                  Completed
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Pipeline flow visualization */}
      <div style={{
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <span style={{ 
          fontWeight: 'bold', 
          color: '#1e3a8a',
          fontSize: '0.95em'
        }}>
          Data Flow:
        </span>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <span style={{ 
              color: currentStep >= step.id ? step.color : '#9ca3af',
              fontWeight: currentStep >= step.id ? 'bold' : 'normal',
              fontSize: '0.9em'
            }}>
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <span style={{ color: '#9ca3af' }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div style={{
        marginTop: '20px',
        background: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        padding: '15px',
        fontSize: '0.9em',
        color: '#92400e'
      }}>
        <strong>💡 Industry Standard:</strong> This pipeline follows the analytics lifecycle used by data teams at companies like Amazon, Google, and Netflix. Each step ensures data quality, analytical rigor, and business value.
      </div>
    </div>
  );
};

export default AnalyticsPipelineVisual;
import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Funnel, FunnelChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, AlertCircle, CheckCircle, Lightbulb, Download, Mic, MicOff, Volume2, VolumeX, Play, Pause, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Activity, LogOut, User, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { auth, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// const API_URL = process.env.REACT_APP_API_URL || '';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  // Authentication states
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rawData, setRawData] = useState('');
  const [csvData, setCsvData] = useState(null);
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoAnalysis, setAutoAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  
  // Voice-related states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

    // Playback control states
  const [currentText, setCurrentText] = useState('');
  const [textSegments, setTextSegments] = useState([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [showPlaybackControls, setShowPlaybackControls] = useState(false);
  const utteranceRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Chart selection state
  const [selectedCharts, setSelectedCharts] = useState(['area', 'bar', 'pie']);
  const [showChartSelector, setShowChartSelector] = useState(false);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#8b5cf6'];

  // Available chart types
  const CHART_OPTIONS = [
    { id: 'area', name: '📈 Area Chart', icon: <Activity size={18} />, description: 'Revenue trends over time' },
    { id: 'bar', name: '📊 Bar Chart', icon: <BarChart3 size={18} />, description: 'Performance comparison' },
    { id: 'line', name: '📉 Line Chart', icon: <LineChartIcon size={18} />, description: 'Trend analysis' },
    { id: 'pie', name: '🥧 Pie Chart', icon: <PieChartIcon size={18} />, description: 'Distribution breakdown' },
    { id: 'scatter', name: '🔵 Scatter Plot', icon: <Activity size={18} />, description: 'Correlation analysis' },
    { id: 'radar', name: '🎯 Radar Chart', icon: <Activity size={18} />, description: 'Multi-dimensional view' },
    { id: 'composed', name: '📊 Composed Chart', icon: <BarChart3 size={18} />, description: 'Combined metrics' },
    { id: 'funnel', name: '⏬ Funnel Chart', icon: <TrendingDown size={18} />, description: 'Conversion funnel' }
  ];

  // Split text into segments (sentences or phrases)
  const splitIntoSegments = (text) => {
    const segments = text
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
    
    return segments;
  };

  const toggleChartSelection = (chartId) => {
    if (selectedCharts.includes(chartId)) {
      // Remove if already selected
      if (selectedCharts.length > 1) { // Keep at least 1 chart
        setSelectedCharts(selectedCharts.filter(id => id !== chartId));
      }
    } else {
      // Add if less than 3 selected
      if (selectedCharts.length < 3) {
        setSelectedCharts([...selectedCharts, chartId]);
      } else {
        // Replace oldest selection
        setSelectedCharts([...selectedCharts.slice(1), chartId]);
      }
    }
  };

 // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        setQuestion(transcript);
        setIsListening(false);
        
        if (csvData) {
          setTimeout(() => askCustomQuestion(transcript), 500);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Could not understand. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [csvData]);

 // Convert numbers to Indian spoken format
  const convertToIndianFormat = (text) => {
    // Convert large numbers to lakhs/crores for better speech
    return text.replace(/₹[\d,]+/g, (match) => {
      const number = parseFloat(match.replace(/[₹,]/g, ''));
      
      if (number >= 10000000) {
        // Crores
        const crores = (number / 10000000).toFixed(2);
        return `₹${crores} crores`;
      } else if (number >= 100000) {
        // Lakhs
        const lakhs = (number / 100000).toFixed(2);
        return `₹${lakhs} lakhs`;
      } else if (number >= 1000) {
        // Thousands
        const thousands = (number / 1000).toFixed(1);
        return `₹${thousands} thousand`;
      } else {
        return match;
      }
    });
  };

const speak = (text, startFromSegment = 0) => {
    if (!voiceEnabled || !text) return;
    
    // Stop any ongoing speech
    synthRef.current.cancel();
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Split text into segments for navigation
    const segments = splitIntoSegments(text);
    setTextSegments(segments);
    setCurrentText(text);
    setCurrentSegmentIndex(startFromSegment);
    setShowPlaybackControls(true);

    // Speak from the specified segment
    const textToSpeak = segments.slice(startFromSegment).join(' ');
    
    // Convert to Indian number format first
    let cleanedText = convertToIndianFormat(textToSpeak);
    
    // Clean up formatting for speech
    cleanedText = cleanedText
      .replace(/[#*`]/g, '')
      .replace(/\n{3,}/g, '. ')
      .replace(/\n\n/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/(\d+)\./g, '$1. ')
      .replace(/:/g, ': ')
      .replace(/\s+/g, ' ')
      .trim();

    utteranceRef.current = new SpeechSynthesisUtterance(cleanedText);
    
    const voices = synthRef.current.getVoices();
    const indianVoice = voices.find(voice => 
      voice.lang.includes('en-IN') || voice.name.includes('Rishi') || voice.name.includes('Indian')
    );
    if (indianVoice) {
      utteranceRef.current.voice = indianVoice;
    }

    utteranceRef.current.rate = 0.90;
    utteranceRef.current.pitch = 1.0;
    utteranceRef.current.volume = 1.0;

    utteranceRef.current.onstart = () => {
      setIsSpeaking(true);
      setSpeechProgress(0);
      
      // Update progress
      progressIntervalRef.current = setInterval(() => {
        setSpeechProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressIntervalRef.current);
            return 100;
          }
          return prev + 1;
        });
      }, (cleanedText.length * 10) / 100);
    };

    utteranceRef.current.onend = () => {
      setIsSpeaking(false);
      setSpeechProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    utteranceRef.current.onerror = () => {
      setIsSpeaking(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    utteranceRef.current.onboundary = (event) => {
      if (event.name === 'sentence') {
        setCurrentSegmentIndex(prev => Math.min(prev + 1, segments.length - 1));
      }
    };

    synthRef.current.speak(utteranceRef.current);
  };

  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };
  
  const pauseSpeaking = () => {
    if (isSpeaking) {
      synthRef.current.pause();
      setIsSpeaking(false);
    }
  };

  const resumeSpeaking = () => {
    if (!isSpeaking && synthRef.current.paused) {
      synthRef.current.resume();
      setIsSpeaking(true);
    }
  };

  // Playback controls
  const rewind = () => {
    const newIndex = Math.max(0, currentSegmentIndex - 1);
    setCurrentSegmentIndex(newIndex);
    speak(currentText, newIndex);
  };

  const forward = () => {
    const newIndex = Math.min(textSegments.length - 1, currentSegmentIndex + 1);
    setCurrentSegmentIndex(newIndex);
    speak(currentText, newIndex);
  };

  const restart = () => {
    setCurrentSegmentIndex(0);
    setSpeechProgress(0);
    speak(currentText, 0);
  };

  const jumpToSegment = (index) => {
    setCurrentSegmentIndex(index);
    speak(currentText, index);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!csvData) {
        setError('Please analyze data first before asking questions!');
        speak('Please analyze some data first before asking questions.');
        return;
      }
      setError('');
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
      speak('Yes, I am listening. Please ask your question.');
    }
  };

 // Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      speak('Welcome! You have successfully signed in.');
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setAnalysis(null);
      setAutoAnalysis(null);
      setCsvData(null);
      setRawData('');
      speak('You have been logged out. See you next time!');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const parseData = async () => {
    if (!rawData.trim()) {
      setError('Please enter some data first!');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

  try {
      const token = user ? await user.getIdToken() : null;
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/parse-data`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rawData })
      });

      const result = await response.json();

      if (result.success) {
        setCsvData(result.csvData);
        await performAutoAnalysis(result.csvData);
        setTimeout(() => {
          speak('Hello! I have analyzed your data. Let me present the key findings.');
        }, 1000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to connect to backend. Make sure server is running on port 5000!');
    } finally {
      setLoading(false);
    }
  };

  const performAutoAnalysis = async (data) => {
    setLoading(true);
    
    try {
      const analysisPrompt = `As a professional data analyst presenting to HR/Management, provide a comprehensive business analysis of this data. 

IMPORTANT: Write this as a SPOKEN PRESENTATION that will be narrated out loud to executives. Use natural, conversational language as if you're actually talking to someone in a meeting.

When mentioning amounts in Indian Rupees:
- Write large numbers in Indian format for speech
- Example: ₹700000 should be written as "seven lakh rupees" or "₹7 lakhs"
- Example: ₹5000000 should be written as "fifty lakh rupees" or "₹50 lakhs"  
- Example: ₹10000000 should be written as "one crore rupees" or "₹1 crore"
- Always mention the actual numbers, not just vague descriptions

Include:
1. Opening Greeting (warm, professional)
2. Executive Summary (2-3 sentences explaining what the data shows with key numbers)
3. Key Metrics (mention ALL specific numbers naturally: total revenue in lakhs/crores, average revenue, growth rate percentage, quantities)
4. Main Findings (3-5 insights, explained conversationally with actual numbers)
5. Business Trends (describe patterns you observe with percentages and amounts)
6. Risks & Opportunities (practical business advice)
7. Recommendations (specific action items)
8. Closing Remarks (offer to answer questions)

Write it like a real conversation - use phrases like "As you can see...", "What's interesting here is...", "I'd recommend...", "Looking at the numbers..."

CRITICAL: Don't skip ANY important metrics. Mention total revenue, average revenue, growth rate, quantities - ALL of them with actual numbers in Indian format (lakhs/crores).

Keep it professional but friendly. Avoid bullet points - write in flowing paragraphs as if speaking.`;

         const token = user ? await user.getIdToken() : null;
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: analysisPrompt, 
          csvData: data 
        })
      });

      const result = await response.json();

      if (result.success) {
        setAutoAnalysis({
          summary: result.content,
          metrics: calculateMetrics(data),
          charts: prepareChartData(data)
        });
        
        // NEW: Save to MongoDB
        await saveAnalysisToMongo(data, result.content, calculateMetrics(data));
        
        setTimeout(() => {
          speak(result.content);
        }, 2000);

      }
    } catch (err) {
      console.error('Auto-analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };
 
  const saveAnalysisToMongo = async (csvData, summary, metrics) => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/save-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rawData: rawData,
          csvData: csvData,
          analysis: {
            summary: summary,
            metrics: metrics
          },
          dataType: 'sales',
          tags: ['auto-saved']
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Analysis saved to history:', result.analysisId);
        setCurrentAnalysisId(result.analysisId);
        
        // Auto-fetch comparison after saving
        if (metrics) {
          await fetchComparison(metrics);
        }
      }
    } catch (error) {
      console.error('Failed to save analysis:', error);
    }
  };

  const fetchAnalysisHistory = async () => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/analysis-history?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisHistory(result.analyses);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchComparison = async (currentMetrics) => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/compare-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentMetrics: currentMetrics,
          dataType: 'sales'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setComparison(result.comparison);
        
        // Speak comparison if available
        if (result.comparison.hasHistory && result.comparison.aiInsight) {
          setTimeout(() => {
            speak(`Historical comparison: ${result.comparison.aiInsight}`);
          }, 8000); // Wait 8 seconds after main analysis
        }
      }
    } catch (error) {
      console.error('Failed to fetch comparison:', error);
    }
  };

  const loadPastAnalysis = async (analysisId) => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/analysis/${analysisId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        const analysis = result.analysis;
        
        // Restore the analysis
        setRawData(analysis.rawData || '');
        setCsvData(analysis.csvData);
        setAutoAnalysis({
          summary: analysis.analysis.summary,
          metrics: analysis.analysis.metrics,
          charts: prepareChartData(analysis.csvData)
        });
        setCurrentAnalysisId(analysis._id);
        
        setShowHistory(false);
        speak('I have loaded your past analysis.');
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    }
  };

  const calculateMetrics = (data) => {
    if (!data || !data.data.length) return null;

    const revenueIdx = data.headers.findIndex(h => 
      h.toLowerCase().includes('revenue') || 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('amount')
    );
    
    const quantityIdx = data.headers.findIndex(h => 
      h.toLowerCase().includes('quantity') || 
      h.toLowerCase().includes('units') || 
      h.toLowerCase().includes('count')
    );

    const revenues = data.data.map(row => parseFloat(row[revenueIdx]) || 0);
    const quantities = quantityIdx >= 0 ? data.data.map(row => parseFloat(row[quantityIdx]) || 0) : [];

    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const avgRevenue = totalRevenue / revenues.length;
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    const totalQuantity = quantities.reduce((a, b) => a + b, 0);
    
    // Calculate growth rate with null check
    const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2));
    const secondHalf = revenues.slice(Math.floor(revenues.length / 2));
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    
    let growthRate = 0;
    if (firstHalfAvg !== 0 && !isNaN(firstHalfAvg) && !isNaN(secondHalfAvg)) {
      growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    }
    
    // Ensure growthRate is a valid number
    if (isNaN(growthRate) || !isFinite(growthRate)) {
      growthRate = 0;
    }

    return {
      totalRevenue: totalRevenue || 0,
      avgRevenue: avgRevenue || 0,
      maxRevenue: maxRevenue || 0,
      minRevenue: minRevenue || 0,
      totalQuantity: totalQuantity || 0,
      growthRate: growthRate || 0,
      dataPoints: data.data.length || 0
    };
  };
  const prepareChartData = (data) => {
    if (!data || !data.data.length) return [];
    
    return data.data.map((row, idx) => {
      const obj = { index: idx };
      data.headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
  };

  const askCustomQuestion = async (voiceQuestion = null) => {
    const questionText = voiceQuestion || question;
    
    if (!csvData) {
      setError('Please parse data first!');
      speak('Please analyze some data first.');
      return;
    }

    if (!questionText.trim()) {
      setError('Please ask a question!');
      speak('Please ask me a question about your data.');
      return;
    }

    setLoading(true);
    setError('');

  try {
      const token = user ? await user.getIdToken() : null;
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: questionText, csvData })
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.content);
        setTimeout(() => {
          speak(result.content);
        }, 500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to analyze. Check backend connection!');
    } finally {
      setLoading(false);
    }
  };

  const chartData = autoAnalysis?.charts || [];
  const metrics = autoAnalysis?.metrics;
  const revenueKey = csvData?.headers.find(h => 
    h.toLowerCase().includes('revenue') || 
    h.toLowerCase().includes('sales') || 
    h.toLowerCase().includes('amount')
  );
  const quantityKey = csvData?.headers.find(h => 
    h.toLowerCase().includes('quantity') || 
    h.toLowerCase().includes('units')
  );
  const dateKey = csvData?.headers[0];

  // Chart rendering function
  const renderChart = (chartType) => {
    if (!chartData.length || !revenueKey) return null;

    const chartConfig = {
      area: (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={revenueKey} stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      ),
      bar: (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={revenueKey} fill="#10b981" radius={[8, 8, 0, 0]} />
            {quantityKey && <Bar dataKey={quantityKey} fill="#f59e0b" radius={[8, 8, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      ),
      line: (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={revenueKey} stroke="#3b82f6" strokeWidth={3} />
            {quantityKey && <Line type="monotone" dataKey={quantityKey} stroke="#f59e0b" strokeWidth={2} />}
          </LineChart>
        </ResponsiveContainer>
      ),
      pie: chartData.length <= 10 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey={revenueKey}
              nameKey={dateKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry[dateKey]}: ₹${entry[revenueKey].toLocaleString()}`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>Pie chart works best with 10 or fewer data points</div>,
      scatter: (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={quantityKey || 'index'} name={quantityKey || 'Index'} />
            <YAxis dataKey={revenueKey} name="Revenue" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Data Points" data={chartData} fill="#8b5cf6" />
          </ScatterChart>
        </ResponsiveContainer>
      ),
      radar: chartData.length <= 8 ? (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey={dateKey} />
            <PolarRadiusAxis />
            <Radar name="Revenue" dataKey={revenueKey} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            {quantityKey && <Radar name="Quantity" dataKey={quantityKey} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      ) : <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>Radar chart works best with 8 or fewer data points</div>,
      composed: (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={revenueKey} fill="#10b981" radius={[8, 8, 0, 0]} />
            {quantityKey && <Line type="monotone" dataKey={quantityKey} stroke="#f59e0b" strokeWidth={3} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      funnel: (
        <ResponsiveContainer width="100%" height={300}>
          <FunnelChart>
            <Tooltip />
            <Funnel
              dataKey={revenueKey}
              data={chartData.slice(0, 6)}
              isAnimationActive
            >
              {chartData.slice(0, 6).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      )
    };

    return chartConfig[chartType];
  };

// Loading Screen
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '2em', fontWeight: 'bold' }}>
          Loading InsightAI... 🧠
        </div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '30px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          padding: '60px 50px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '3em', 
            margin: '0 0 10px 0',
            background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🧠 InsightAI
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.2em', margin: '0 0 30px 0' }}>
            Your AI-Powered Data Analyst
          </p>
          
          <button
            onClick={handleSignIn}
            style={{
              width: '100%',
              padding: '18px',
              background: 'linear-gradient(135deg, #4285f4, #34a853)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(66, 133, 244, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Main App (After Login)
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',

      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}></div>
            <h1 style={{ 
              fontSize: '2.5em', 
              margin: '0',
              background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
              flex: 2
            }}>
              🧠 AI Data Analyst
            </h1>
             <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: '#f3f4f6',
                padding: '8px 15px',
                borderRadius: '10px'
              }}>
                <User size={18} style={{ color: '#1e3a8a' }} />
                <span style={{ color: '#1e3a8a', fontSize: '0.9em', fontWeight: '600' }}>
                  {user.displayName || user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '10px 15px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 'bold'
                }}
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                style={{
                  padding: '10px 15px',
                  background: voiceEnabled ? '#10b981' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 'bold'
                }}
                title={voiceEnabled ? 'Voice ON' : 'Voice OFF'}
              >
                {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  style={{
                    padding: '10px 15px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 'bold',
                    animation: 'pulse 1.5s infinite'
                  }}
                >
                  <Pause size={20} /> Stop
                </button>
              )}
            </div>
          </div>
          <p style={{ color: '#666', fontSize: '1.1em', margin: 0 }}>
            Your Virtual Data Scientist - {voiceEnabled ? '🎤 Voice-Enabled' : '🔇 Silent Mode'}
          </p>
        </div>

        {/* Data Input Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ color: '#1e3a8a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={24} /> Upload Your Business Data
          </h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Paste any sales data, revenue reports, customer data, or business metrics. I'll analyze it like a professional data scientist.
          </p>
          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder="Example:&#10;Jan  Mobile Rs5000&#10;February  Mobile Rs1000&#10;March  Mobile Rs30000&#10;April  Mobile Rs500&#10;&#10;Or paste Excel data, CSV, or even messy notes!"
            rows="8"
            style={{
              width: '100%',
              padding: '15px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '1em',
              fontFamily: 'monospace',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
          <button 
            onClick={parseData} 
            disabled={loading}
            style={{
              marginTop: '15px',
              padding: '15px 40px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1em',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(30, 58, 138, 0.4)'
            }}
          >
            {loading ? '⏳ Analyzing Your Data...' : '🚀 Analyze Data'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={24} />
            {error}
          </div>
        )}

        {/* Key Metrics Dashboard */}
        {metrics && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '15px',
                padding: '25px',
                color: 'white',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <DollarSign size={24} />
                  <span style={{ fontSize: '0.9em', opacity: 0.9 }}>Total Revenue</span>
                </div>
                <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                  ₹{metrics.totalRevenue.toLocaleString()}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '15px',
                padding: '25px',
                color: 'white',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <TrendingUp size={24} />
                  <span style={{ fontSize: '0.9em', opacity: 0.9 }}>Growth Rate</span>
                </div>
                <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                  {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '15px',
                padding: '25px',
                color: 'white',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Package size={24} />
                  <span style={{ fontSize: '0.9em', opacity: 0.9 }}>Units Sold</span>
                </div>
                <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                  {metrics.totalQuantity || metrics.dataPoints}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                borderRadius: '15px',
                padding: '25px',
                color: 'white',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Users size={24} />
                  <span style={{ fontSize: '0.9em', opacity: 0.9 }}>Avg Revenue</span>
                </div>
                <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                  ₹{metrics.avgRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Report */}
        {autoAnalysis && (
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
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Lightbulb size={28} />
              Professional Analysis Report
              {isSpeaking && (
                <span style={{ 
                  marginLeft: '10px', 
                  color: '#10b981',
                  fontSize: '0.9em',
                  animation: 'pulse 1.5s infinite'
                }}>
                  🔊 Speaking...
                </span>
              )}
            </h2>
            <div style={{
              background: '#f0f9ff',
              border: '2px solid #bae6fd',
              borderRadius: '12px',
              padding: '25px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui',
              lineHeight: '1.8',
              color: '#1e40af'
            }}>
              {autoAnalysis.summary}
            </div>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => speak(autoAnalysis.summary)}
                disabled={isSpeaking}
                style={{
                  padding: '10px 20px',
                  background: isSpeaking ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isSpeaking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
              >
                <Play size={16} />
                {isSpeaking ? 'Speaking...' : 'Narrate Report'}
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  <Pause size={16} />
                  Stop
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== ADD THIS ENTIRE SECTION HERE ==================== */}
        {/* Playback Controls Panel */}
        {showPlaybackControls && autoAnalysis && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ color: '#1e3a8a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🎙️ Voice Playback Controls
              {isSpeaking && (
                <span style={{ color: '#10b981', fontSize: '0.9em', animation: 'pulse 1.5s infinite' }}>
                  ● Speaking...
                </span>
              )}
            </h3>
            
            {/* Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${speechProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  transition: 'width 0.3s'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.85em', color: '#666' }}>
                <span>Segment {currentSegmentIndex + 1} of {textSegments.length}</span>
                <span>{speechProgress.toFixed(0)}%</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={restart}
                style={{
                  padding: '12px 20px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
                title="Restart from beginning"
              >
                <RotateCcw size={18} />
                Restart
              </button>

              <button
                onClick={rewind}
                disabled={currentSegmentIndex === 0}
                style={{
                  padding: '12px 20px',
                  background: currentSegmentIndex === 0 ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: currentSegmentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
                title="Go back 1 segment"
              >
                <SkipBack size={18} />
                Rewind
              </button>

              {isSpeaking ? (
                <button
                  onClick={pauseSpeaking}
                  style={{
                    padding: '12px 20px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  <Pause size={18} />
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => speak(currentText, currentSegmentIndex)}
                  style={{
                    padding: '12px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  <Play size={18} />
                  Play
                </button>
              )}

              <button
                onClick={forward}
                disabled={currentSegmentIndex >= textSegments.length - 1}
                style={{
                  padding: '12px 20px',
                  background: currentSegmentIndex >= textSegments.length - 1 ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: currentSegmentIndex >= textSegments.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
                title="Skip forward 1 segment"
              >
                Forward
                <SkipForward size={18} />
              </button>

              <button
                onClick={stopSpeaking}
                style={{
                  padding: '12px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
              >
                <VolumeX size={18} />
                Stop
              </button>
            </div>

            {/* Segment Navigation */}
            {textSegments.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px', fontWeight: 'bold' }}>
                  Quick Jump to Section:
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                  gap: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  padding: '10px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  {textSegments.map((segment, index) => (
                    <button
                      key={index}
                      onClick={() => jumpToSegment(index)}
                      style={{
                        padding: '8px',
                        background: index === currentSegmentIndex ? '#10b981' : '#e5e7eb',
                        color: index === currentSegmentIndex ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85em',
                        fontWeight: index === currentSegmentIndex ? 'bold' : 'normal'
                      }}
                      title={segment.substring(0, 50) + '...'}
                    >
                      #{index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Segment Display */}
            {textSegments[currentSegmentIndex] && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: '#f0f9ff',
                border: '2px solid #bae6fd',
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '0.85em', color: '#0369a1', marginBottom: '5px', fontWeight: 'bold' }}>
                  Currently Playing:
                </div>
                <div style={{ color: '#0c4a6e', lineHeight: '1.6' }}>
                  {textSegments[currentSegmentIndex]}
                </div>
              </div>
            )}
          </div>
        )}
        {/* ==================== END OF PLAYBACK CONTROLS ==================== */}

        {/* Chart Selector & Interactive Charts */}
        {chartData.length > 0 && revenueKey && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e3a8a', margin: 0 }}>
                📊 Visual Analytics Dashboard
              </h2>
              <button
                onClick={() => setShowChartSelector(!showChartSelector)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <BarChart3 size={18} />
                {showChartSelector ? 'Hide Chart Options' : 'Choose Charts'}
              </button>
            </div>

            {/* Chart Selector */}
            {showChartSelector && (
              <div style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '25px',
                border: '2px solid #e5e7eb'
              }}>
                <p style={{ margin: '0 0 15px 0', color: '#374151', fontWeight: 'bold' }}>
                  Select any 3 charts to display ({selectedCharts.length}/3 selected)
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px'
                }}>
                  {CHART_OPTIONS.map(chart => (
                    <button
                      key={chart.id}
                      onClick={() => toggleChartSelection(chart.id)}
                      style={{
                        padding: '15px',
                        background: selectedCharts.includes(chart.id) 
                          ? 'linear-gradient(135deg, #10b981, #059669)' 
                          : 'white',
                        color: selectedCharts.includes(chart.id) ? 'white' : '#374151',
                        border: `2px solid ${selectedCharts.includes(chart.id) ? '#10b981' : '#d1d5db'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        fontWeight: selectedCharts.includes(chart.id) ? 'bold' : 'normal'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        {chart.icon}
                        <span>{chart.name}</span>
                        {selectedCharts.includes(chart.id) && <CheckCircle size={16} />}
                      </div>
                      <div style={{ 
                        fontSize: '0.85em', 
                        opacity: 0.8,
                        marginTop: '5px'
                      }}>
                        {chart.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display Selected Charts */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '25px'
            }}>
              {selectedCharts.map(chartType => {
                const chartOption = CHART_OPTIONS.find(c => c.id === chartType);
                return (
                  <div 
                    key={chartType}
                    style={{
                      background: '#fafafa',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #e5e7eb'
                    }}
                  >
                    <h3 style={{ margin: '0 0 15px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {chartOption?.icon}
                      {chartOption?.name}
                    </h3>
                    {renderChart(chartType)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Question Section */}
        {csvData && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ color: '#1e3a8a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mic size={24} />
              💬 Ask Your Data Analyst Anything
            </h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Type your question OR click the microphone to speak naturally!
            </p>
            
            {/* Voice Input Section */}
            <div style={{ 
              marginBottom: '20px', 
              padding: '20px',
              background: isListening ? '#fef3c7' : '#f3f4f6',
              borderRadius: '12px',
              border: `2px solid ${isListening ? '#f59e0b' : '#e5e7eb'}`,
              transition: 'all 0.3s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                  onClick={toggleListening}
                  disabled={!csvData}
                  style={{
                    padding: '15px',
                    background: isListening 
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: csvData ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    animation: isListening ? 'pulse 1.5s infinite' : 'none'
                  }}
                  title={isListening ? 'Stop Listening' : 'Start Voice Input'}
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px' }}>
                    {isListening ? '🎤 Listening... Speak now!' : '🎙️ Voice Input Ready'}
                  </div>
                  {transcript && (
                    <div style={{ color: '#059669', fontSize: '0.9em' }}>
                      Heard: "{transcript}"
                    </div>
                  )}
                  {isListening && (
                    <div style={{ color: '#f59e0b', fontSize: '0.9em' }}>
                      Speak clearly in English or Hindi...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text Input Section */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., 'Predict next month', 'Why did sales drop?', 'Should I hire more staff?'"
                onKeyPress={(e) => e.key === 'Enter' && askCustomQuestion()}
                style={{
                  flex: 1,
                  padding: '15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '1em'
                }}
              />
              <button 
                onClick={() => askCustomQuestion()} 
                disabled={loading}
                style={{
                  padding: '15px 35px',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳' : '🤖 Ask'}
              </button>
            </div>

            {/* Quick Questions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                'Predict next week sales',
                'What are the top performers?',
                'Find anomalies',
                'Suggest improvements',
                'Compare trends'
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); }}
                  style={{
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '20px',
                    fontSize: '0.9em',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {analysis && (
              <div style={{
                marginTop: '20px',
                background: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#166534', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px' 
                }}>
                  <CheckCircle size={24} />
                  AI Response
                  {isSpeaking && (
                    <span style={{ 
                      marginLeft: '10px', 
                      color: '#10b981',
                      fontSize: '0.8em',
                      animation: 'pulse 1.5s infinite'
                    }}>
                      🔊 Speaking...
                    </span>
                  )}
                </h3>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui',
                  lineHeight: '1.7',
                  color: '#166534'
                }}>
                  {analysis}
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => speak(analysis)}
                    disabled={isSpeaking}
                    style={{
                      padding: '10px 20px',
                      background: isSpeaking ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: isSpeaking ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    <Play size={16} />
                    {isSpeaking ? 'Speaking...' : 'Read Answer'}
                  </button>
                  {isSpeaking && (
                    <button
                      onClick={stopSpeaking}
                      style={{
                        padding: '10px 20px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 'bold'
                      }}
                    >
                      <Pause size={16} />
                      Stop
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis History & Comparison Section */}
        {user && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e3a8a', margin: 0 }}>
                📊 Analysis History & Performance Tracking
              </h2>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) fetchAnalysisHistory();
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {showHistory ? 'Hide History' : 'View Past Analyses'}
              </button>
            </div>

            {/* Historical Comparison Display */}
            {comparison && comparison.hasHistory && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={24} />
                  📈 Performance vs Historical Average
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
                    <div style={{ color: '#92400e', fontSize: '0.9em', marginBottom: '5px' }}>Current Revenue</div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#1e3a8a' }}>
                      ₹{comparison.metrics.current.totalRevenue.toLocaleString()}
                    </div>
                  </div>
                  
                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
                    <div style={{ color: '#92400e', fontSize: '0.9em', marginBottom: '5px' }}>Past Average</div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#6b7280' }}>
                      ₹{comparison.metrics.pastAverage.totalRevenue.toLocaleString()}
                    </div>
                  </div>
                  
                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
                    <div style={{ color: '#92400e', fontSize: '0.9em', marginBottom: '5px' }}>Change</div>
                    <div style={{ 
                      fontSize: '1.5em', 
                      fontWeight: 'bold', 
                      color: parseFloat(comparison.metrics.changes.revenueChange) > 0 ? '#10b981' : '#ef4444'
                    }}>
                      {parseFloat(comparison.metrics.changes.revenueChange) > 0 ? '+' : ''}
                      {comparison.metrics.changes.revenueChange}%
                    </div>
                  </div>
                  
                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
                    <div style={{ color: '#92400e', fontSize: '0.9em', marginBottom: '5px' }}>Analyses Compared</div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#1e3a8a' }}>
                      {comparison.pastAnalysesCount}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '15px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  color: '#1f2937'
                }}>
                  <strong>AI Insight:</strong><br />
                  {comparison.aiInsight}
                </div>
              </div>
            )}

            {/* History List */}
            {showHistory && (
              <div style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '20px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1e3a8a' }}>
                  Past Analyses ({analysisHistory.length})
                </h3>
                
                {analysisHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                    No past analyses yet. Start analyzing data to build your history!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analysisHistory.map((item) => (
                      <div
                        key={item._id}
                        style={{
                          background: 'white',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          padding: '15px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => loadPastAnalysis(item._id)}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1e3a8a'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px' }}>
                              {new Date(item.timestamp || item.createdAt).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
                              Type: {item.dataType || 'Sales'} • {item.analysis?.metrics?.dataPoints || 0} data points
                            </div>
                          </div>
                          <div style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            fontSize: '0.9em',
                            fontWeight: 'bold'
                          }}>
                            Load
                          </div>
                        </div>
                        
                        {item.analysis?.metrics && (
                          <div style={{ 
                            display: 'flex', 
                            gap: '15px', 
                            fontSize: '0.9em',
                            color: '#374151',
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: '10px'
                          }}>
                            <div>
                              <strong>Revenue:</strong> ₹{item.analysis.metrics.totalRevenue?.toLocaleString() || 0}
                            </div>
                            <div>
                              <strong>Growth:</strong> {item.analysis.metrics.growthRate?.toFixed(1) || 0}%
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Add pulse animation for speaking indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default App;
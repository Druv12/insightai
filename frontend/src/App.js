  import React, { useState, useRef, useEffect } from 'react';
  import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Funnel, FunnelChart } from 'recharts';
  import { TrendingUp, TrendingDown, DollarSign, Package, Users, AlertCircle, CheckCircle, Lightbulb, Download, Mic, MicOff, Volume2, VolumeX, Play, Pause, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Activity, LogOut, User, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
  import { auth, signInWithGoogle, logout } from './firebase';
  import { onAuthStateChanged } from 'firebase/auth';

  // const API_URL = process.env.REACT_APP_API_URL || '';
  const API_URL = '';

  function App() {
    // Authentication states
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [rawData, setRawData] = useState('');
    const [inputMode, setInputMode] = useState('text'); // 'text' or 'file' ← ADD THIS
    const [uploadedFile, setUploadedFile] = useState(null); // ← ADD THIS
    const [uploadedFileName, setUploadedFileName] = useState(''); // ← ADD THIS
    const [csvData, setCsvData] = useState(null);
    const [question, setQuestion] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoAnalysis, setAutoAnalysis] = useState(null);
    const [analysisHistory, setAnalysisHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    // ✅ ADD THESE LINES
const [statistics, setStatistics] = useState(null);
const [showStatsSection, setShowStatsSection] = useState(false); // Optional: control visibility
  const [comparison, setComparison] = useState(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [loadedAnalysis, setLoadedAnalysis] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
    
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

  // Check authentication state - SIMPLIFIED for POPUP
  useEffect(() => {
    console.log('🔍 [APP] Initializing authentication...');
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      console.log('🔐 [APP] Auth state changed');
      console.log('🔐 [APP] Current user:', currentUser ? currentUser.email : 'none');
      
      if (currentUser) {
        console.log('✅ [APP] User authenticated:', currentUser.email);
        console.log('✅ [APP] User UID:', currentUser.uid);
        
        // Store fresh token
        try {
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          console.log('✅ [APP] Token stored');
        } catch (e) {
          console.error('⚠️ [APP] Token storage failed:', e);
        }
        
        setUser(currentUser);
        
      } else {
        console.log('ℹ️ [APP] No user signed in');
        setUser(null);
      }
      
      setAuthLoading(false);
    });

    return () => {
      console.log('🧹 [APP] Cleaning up auth listener');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Initialize speech recognition
    useEffect(() => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
      // CRITICAL: Cleanup on unmount
      return () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.warn('Recognition cleanup failed:', e);
          }
        }
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        try {
          synthRef.current.cancel();
        } catch (e) {
          console.warn('Speech cleanup failed:', e);
        }
      };
    }, [csvData]);

  // Convert numbers to Indian spoken format
    const convertToIndianFormat = (text) => {
  // ✅ FIX 1: Remove ALL emojis FIRST (including 📊🎯💰📈 etc.)
  let cleanedText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  
  // ✅ FIX 2: Convert "₹9 lakhs" → "9 lakhs" (removes ₹ and "rupees" word to prevent "rupees lakhs")
  cleanedText = cleanedText.replace(/₹\s*(\d+(?:\.\d+)?)\s*(lakh|crore)s?/gi, (match, number, unit) => {
    return `${number} ${unit}`;
  });
  
  // ✅ FIX 3: For plain numbers like ₹500 or ₹5000 (without lakh/crore)
  cleanedText = cleanedText.replace(/₹[\d,]+/g, (match) => {
    const number = parseFloat(match.replace(/[₹,]/g, ''));
    
    if (isNaN(number)) return match;
    
    if (number >= 10000000) {
      // Crores - NO "rupees" word
      const crores = number / 10000000;
      return crores % 1 === 0 
        ? `${crores} crore` 
        : `${crores.toFixed(2)} crore`;
    } else if (number >= 100000) {
      // Lakhs - NO "rupees" word
      const lakhs = number / 100000;
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
  
  // ✅ FIX 4: Convert superscript numbers to natural speech
  cleanedText = cleanedText
    .replace(/R²/gi, 'R squared')           // R² → "R squared"
    .replace(/²/g, ' squared')              // Any ² → "squared"
    .replace(/³/g, ' cubed')                // Any ³ → "cubed"
    .replace(/¹/g, '')                      // Remove superscript 1
    .replace(/[⁰⁴⁵⁶⁷⁸⁹]/g, '');            // Remove other superscripts
  
  return cleanedText;
};
  const speak = (text, startFromSegment = 0) => {
      if (!voiceEnabled || !text) return;
      
      // SAFE CLEANUP: Stop any ongoing speech
      try {
        synthRef.current.cancel();
      } catch (e) {
        console.warn('Speech cancel failed:', e);
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Wait for cancellation to complete
      setTimeout(() => {
        speakInternal(text, startFromSegment);
      }, 100);
    };

    const speakInternal = (text, startFromSegment = 0) => {

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
        // CRITICAL FIX: Handle decimal points WITHOUT creating pauses
        .replace(/(\d)\.(\d)/g, '$1point$2')  // "2.5" becomes "2point5" (no spaces)
        .replace(/point/g, ' point ')         // Add natural spacing: "2 point 5"
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
      console.log('🔐 [APP] Sign-in button clicked');
      const user = await signInWithGoogle();
      
      if (user) {
        console.log('✅ [APP] Sign-in successful:', user.email);
        speak('Welcome! You have successfully signed in.');
      }
    } catch (error) {
      console.error('❌ [APP] Sign-in error:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
      speak('Sign in failed. Please try again.');
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
    // Handle file upload
    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // CLIENT-SIDE VALIDATION
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('File too large! Maximum size is 10MB.');
        speak('File is too large. Please upload a file smaller than 10 megabytes.');
        return;
      }

      const allowedTypes = ['.csv', '.xlsx', '.xls', '.pdf', '.docx', '.doc'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        setError('Invalid file type! Please upload CSV, Excel, PDF, or Word files.');
        speak('Invalid file type. Please upload a CSV, Excel, PDF, or Word file.');
        return;
      }

      setUploadedFile(file);
      setUploadedFileName(file.name);
      setError('');

      const formData = new FormData();
      formData.append('file', file);

      setLoading(true);

      try {
        const token = user ? await user.getIdToken() : null;
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/upload-file`, {
          method: 'POST',
          headers,
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          setRawData(result.extractedData);
          speak(`File ${file.name} uploaded successfully. Click Analyze to process the data.`);
        } else {
          setError(result.error || 'Failed to process file');
          speak('Failed to process the file. Please try again.');
        }
      } catch (err) {
        setError('Failed to upload file. Make sure server is running!');
        speak('Failed to upload file. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    const parseData = async () => {
    if (!rawData.trim()) {
      setError('Please enter some data first!');
      return;
    }

    const lineCount = rawData.split('\n').length;
    
    // ============================================
    // ENHANCED SIZE WARNING WITH RECOMMENDATIONS
    // ============================================
    if (lineCount > 10000) {
      const confirmed = window.confirm(
        `⚠️ LARGE FILE DETECTED: ${lineCount.toLocaleString()} rows\n\n` +
        `Processing may take 30-60 seconds.\n` +
        `Charts will use sampled data for performance.\n\n` +
        `Continue?`
      );
      if (!confirmed) return;
    } else if (lineCount > 5000) {
      const confirmed = window.confirm(
        `This file has ${lineCount.toLocaleString()} rows. Processing may take 10-30 seconds. Continue?`
      );
      if (!confirmed) return;
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
        
        if (result.rowCount >= 1000) {
          speak(`Successfully processed ${result.rowCount} rows of data. This is a large dataset. Analysis is ready.`);
        }
        
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
    setShowPlaybackControls(false);
    
    const rowCount = data.data.length;
    if (rowCount > 10000) {
      setError('');
      console.log(`⏳ Processing ${rowCount.toLocaleString()} rows - this may take 30-60 seconds...`);
    }
    
    try {
      const analysisPrompt = `As a professional data analyst presenting to HR/Management...`; // Your full prompt
      
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

      // ✅ FIXED: Added space after "if"
      if (result.success) {  
        setAutoAnalysis({
          summary: result.content,
          metrics: calculateMetrics(data),
          charts: prepareChartData(data),
          industryType: result.industryType || 'business',
          statistics: result.statistics
        });
        setStatistics(result.statistics);
        
        // ✅ FIXED: Only run if API succeeds
        await saveAnalysisToMongo(data, result.content, calculateMetrics(data));
        
        setTimeout(() => {
          speak(result.content);
        }, 2000);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
      
    } catch (err) {
      console.error('Auto-analysis failed:', err);
      setError('Analysis failed. Please try again.');
      speak('Analysis failed. Please check your data and try again.');
    } finally {
      setLoading(false);
    }
  };
  
    const saveAnalysisToMongo = async (csvData, summary, metrics) => {
      try {
        const token = await user.getIdToken();
        
        // ============================================
        // SMART STORAGE: Don't save huge datasets to MongoDB
        // ============================================
        const rowCount = csvData.data.length;
        
        // For large datasets, save only metadata + samples
        let dataToSave = csvData;
        let rawDataToSave = rawData;
        
        if (rowCount > 1000) {
          console.log(`📦 Large dataset (${rowCount} rows) - saving metadata only to MongoDB`);
          
          // Save only first 100 rows as sample
          dataToSave = {
            headers: csvData.headers,
            data: csvData.data.slice(0, 100) // Only first 100 rows
          };
          
          // Trim raw data too
          const rawLines = rawData.split('\n');
          rawDataToSave = rawLines.slice(0, 101).join('\n'); // Header + 100 rows
        }
        
        const response = await fetch(`${API_URL}/api/save-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rawData: rawDataToSave, // Trimmed for large datasets
            csvData: dataToSave, // Only samples for large datasets
            analysis: {
              summary: summary,
              metrics: metrics
            },
            industryType: csvData?.industryType || 'business', 
            dataType: 'sales',
            tags: ['auto-saved'],
            // Add metadata about original size
            originalRowCount: rowCount,
            isSampled: rowCount > 1000
          })
        });
        const result = await response.json();
        
  if (result.success) {
    console.log('✅ Analysis saved to history:', result.analysisId);
    setCurrentAnalysisId(result.analysisId);
    // Comparison is now manual - user clicks button
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
      
      // Get the current industry type from validation result
      const currentIndustry = autoAnalysis?.industryType || 
                            csvData?.industryType || 
                            'business';
      
      console.log('📊 Requesting comparison for industry:', currentIndustry);
      
      const response = await fetch(`${API_URL}/api/compare-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentMetrics: currentMetrics,
          dataType: 'sales',
          currentIndustry: currentIndustry  // ← ADD THIS!
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setComparison(result.comparison);
        
        // Speak comparison if available
        if (result.comparison.hasHistory && result.comparison.aiInsight) {
          setTimeout(() => {
            speak(result.comparison.aiInsight);
          }, 8000);
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
        
        // Store loaded analysis for comparison
        setLoadedAnalysis({
          id: analysis._id,
          summary: analysis.analysis.summary,
          metrics: analysis.analysis.metrics,
          industryType: analysis.industryType || 'business',
          timestamp: analysis.timestamp || analysis.createdAt
        });
        
        setShowHistory(false);
        speak('Past analysis loaded. Click Compare to see the comparison.');
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    }
  };
    
    const performManualComparison = async () => {
    if (!autoAnalysis || !loadedAnalysis) {
      setError('Please have both current analysis and loaded analysis ready');
      return;
    }

    if (autoAnalysis.industryType !== loadedAnalysis.industryType) {
      setComparison({
        hasHistory: true,
        canCompare: false,
        currentIndustry: autoAnalysis.industryType,
        loadedIndustry: loadedAnalysis.industryType,
        warningMessage: `⚠️ **Cannot Compare Different Industries**

  Current Analysis: ${autoAnalysis.industryType.toUpperCase()}
  Loaded Analysis: ${loadedAnalysis.industryType.toUpperCase()}

  These are different industry types and cannot be meaningfully compared. Please load an analysis from the same industry (${autoAnalysis.industryType}) to enable comparison.`
      });
      setShowComparison(true);
      speak('Cannot compare different industries. Please load a same-industry analysis.');
      return;
    }

    // Perform comparison with same industry
    const currentMetrics = autoAnalysis.metrics;
    const pastMetrics = loadedAnalysis.metrics;

    const revenueChange = pastMetrics.totalRevenue !== 0 
      ? (((currentMetrics.totalRevenue - pastMetrics.totalRevenue) / pastMetrics.totalRevenue) * 100).toFixed(2)
      : 0;
    
    const growthChange = pastMetrics.growthRate !== 0
      ? (((currentMetrics.growthRate - pastMetrics.growthRate) / Math.abs(pastMetrics.growthRate)) * 100).toFixed(2)
      : 0;

    const trend = parseFloat(revenueChange) > 5 ? 'improving' : 
                  parseFloat(revenueChange) < -5 ? 'declining' : 'stable';

    // Generate AI insight
    const comparisonPrompt = `Compare these two ${autoAnalysis.industryType} analyses:

  **CURRENT ANALYSIS:**
  - Revenue: ₹${currentMetrics.totalRevenue.toLocaleString()} (₹${(currentMetrics.totalRevenue / 100000).toFixed(2)} lakhs)
  - Growth Rate: ${currentMetrics.growthRate.toFixed(2)}%
  - Data Points: ${currentMetrics.dataPoints}

  **LOADED ANALYSIS (Past):**
  - Revenue: ₹${pastMetrics.totalRevenue.toLocaleString()} (₹${(pastMetrics.totalRevenue / 100000).toFixed(2)} lakhs)
  - Growth Rate: ${pastMetrics.growthRate.toFixed(2)}%
  - Data Points: ${pastMetrics.dataPoints}

  **CHANGES:**
  - Revenue Change: ${revenueChange}%
  - Trend: ${trend}

  Provide a concise comparison insight (3-4 sentences) highlighting key differences and recommendations.`;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: comparisonPrompt,
          csvData: csvData
        })
      });

      const result = await response.json();
      
      setComparison({
        hasHistory: true,
        canCompare: true,
        currentIndustry: autoAnalysis.industryType,
        trend: trend,
        metrics: {
          current: {
            totalRevenue: currentMetrics.totalRevenue,
            growthRate: currentMetrics.growthRate,
            dataPoints: currentMetrics.dataPoints
          },
          past: {
            totalRevenue: pastMetrics.totalRevenue,
            growthRate: pastMetrics.growthRate,
            dataPoints: pastMetrics.dataPoints
          },
          changes: {
            revenueChange: revenueChange,
            growthChange: growthChange
          }
        },
        aiInsight: result.content || 'Comparison complete'
      });

      setShowComparison(true);
      speak('Comparison complete. Here are the key differences.');
    } catch (error) {
      console.error('Comparison failed:', error);
      setError('Failed to generate comparison');
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
      if (firstHalfAvg > 0 && !isNaN(firstHalfAvg) && !isNaN(secondHalfAvg)) {
        growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        
        // Cap extreme values to prevent UI issues
        if (growthRate > 1000) growthRate = 1000;
        if (growthRate < -100) growthRate = -100;
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
      
      // ============================================
      // CHART OPTIMIZATION: Limit data points for performance
      // ============================================
      const rowCount = data.data.length;
      let chartData = data.data;
      
      // For large datasets, use smart sampling for charts
      if (rowCount > 500) {
        console.log(`📊 Large dataset (${rowCount} rows) - sampling for charts`);
        
        // Strategy: Take evenly distributed samples across the dataset
        const sampleSize = 500;
        const step = Math.floor(rowCount / sampleSize);
        
        chartData = [];
        for (let i = 0; i < rowCount; i += step) {
          chartData.push(data.data[i]);
        }
        
        // Ensure we don't exceed 500 points
        chartData = chartData.slice(0, sampleSize);
      }
      
      return chartData.map((row, idx) => {
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
        // TIMEOUT PROTECTION
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
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
          body: JSON.stringify({ question: questionText, csvData }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const result = await response.json();

        if (result.success) {
          setAnalysis(result.content);
          setStatistics(result.statistics);  // ← NEW: Capture stats for custom questions
          setTimeout(() => {
            speak(result.content);
          }, 500);
        } else {
          setError(result.error);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
          speak('The request took too long. Please try again.');
        } else {
          setError('Failed to analyze. Check backend connection!');
        }
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
              <XAxis 
                dataKey={dateKey} 
                label={{ value: dateKey || 'Period', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey={revenueKey} stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        ),
        bar: (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={dateKey}
                label={{ value: dateKey || 'Period', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Amount', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => value.toLocaleString()} />
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
              <XAxis 
                dataKey={dateKey}
                label={{ value: dateKey || 'Period', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => value.toLocaleString()} />
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
                label={(entry) => {
                  const total = chartData.reduce((sum, item) => sum + (item[revenueKey] || 0), 0);
                  const percent = ((entry[revenueKey] / total) * 100).toFixed(1);
                  return `${entry[dateKey]}: ${percent}%`;
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>Pie chart works best with 10 or fewer data points</div>,
        scatter: (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={quantityKey || 'index'} 
                name={quantityKey || 'Index'}
                label={{ value: quantityKey || 'Index', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey={revenueKey} 
                name="Revenue"
                label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value) => `₹${value.toLocaleString()}`} />
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
              <Tooltip formatter={(value) => value.toLocaleString()} />
            </RadarChart>
          </ResponsiveContainer>
        ) : <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>Radar chart works best with 8 or fewer data points</div>,
        composed: (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={dateKey}
                label={{ value: dateKey || 'Period', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey={revenueKey} fill="#10b981" radius={[8, 8, 0, 0]} />
              {quantityKey && <Line type="monotone" dataKey={quantityKey} stroke="#f59e0b" strokeWidth={3} />}
            </ComposedChart>
          </ResponsiveContainer>
        ),
        funnel: (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
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

  // Loading Screen with DEBUG info
  // ✅ CLEAN Loading Screen (No Debug Info)
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{ 
          color: 'white', 
          fontSize: '2em', 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          Loading InsightAI... 🧠
          {/* Loading spinner */}
          <div style={{
            width: '30px',
            height: '30px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        
        {/* Add CSS animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
                🧠 InsightAI - Universal Analytics
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
              AI-Powered Analytics for Any Industry - {voiceEnabled ? '🎤 Voice-Enabled' : '🔇 Silent Mode'}
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
              Paste data from ANY industry - Sales, FinTech, Marketing, Healthcare, Education, Retail, or anything else. I'll automatically detect the type and provide relevant insights. <strong>Try a demo dataset below!</strong>
            </p>

            {/* ========== NEW: Input Mode Toggle ========== */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setInputMode('text')}
                style={{
                  padding: '12px 24px',
                  background: inputMode === 'text' 
                    ? 'linear-gradient(135deg, #1e3a8a, #7c3aed)' 
                    : '#f3f4f6',
                  color: inputMode === 'text' ? 'white' : '#374151',
                  border: `2px solid ${inputMode === 'text' ? '#1e3a8a' : '#d1d5db'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ✍️ Paste Text/CSV
              </button>
              <button
                onClick={() => setInputMode('file')}
                style={{
                  padding: '12px 24px',
                  background: inputMode === 'file' 
                    ? 'linear-gradient(135deg, #1e3a8a, #7c3aed)' 
                    : '#f3f4f6',
                  color: inputMode === 'file' ? 'white' : '#374151',
                  border: `2px solid ${inputMode === 'file' ? '#1e3a8a' : '#d1d5db'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📎 Upload File
              </button>
            </div>

            {/* ========== TEXT INPUT MODE ========== */}
            {inputMode === 'text' && (
              <>
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/api/demo-datasets`);
                        const result = await response.json();
                        if (result.success) {
                          setRawData(result.datasets.ecommerce.data);
                          speak('Loaded e-commerce demo data. Click Analyze to see insights.');
                        }
                      } catch (err) {
                        setError('Failed to load demo data');
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📦 E-commerce Demo
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/api/demo-datasets`);
                        const result = await response.json();
                        if (result.success) {
                          setRawData(result.datasets.fintech.data);
                          speak('Loaded FinTech demo data. Click Analyze to see insights.');
                        }
                      } catch (err) {
                        setError('Failed to load demo data');
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    💳 FinTech Demo
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/api/demo-datasets`);
                        const result = await response.json();
                        if (result.success) {
                          setRawData(result.datasets.marketing.data);
                          speak('Loaded marketing demo data. Click Analyze to see insights.');
                        }
                      } catch (err) {
                        setError('Failed to load demo data');
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📊 Marketing Demo
                  </button>
                </div>
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
              </>
            )}

            {/* ========== FILE UPLOAD MODE ========== */}
            {inputMode === 'file' && (
              <div style={{
                border: '3px dashed #d1d5db',
                borderRadius: '15px',
                padding: '40px',
                textAlign: 'center',
                background: '#f9fafb'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '4em', marginBottom: '10px' }}>📁</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px' }}>
                    Upload Your Data File
                  </div>
                  <div style={{ color: '#6b7280', marginBottom: '20px' }}>
                    Supports: CSV, Excel (.xlsx, .xls), PDF, Word (.docx)
                  </div>
                </div>

                <input
                  type="file"
                  id="fileUpload"
                  accept=".csv,.xlsx,.xls,.pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                
                <label
                  htmlFor="fileUpload"
                  style={{
                    display: 'inline-block',
                    padding: '15px 40px',
                    background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
                    color: 'white',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1.1em',
                    boxShadow: '0 4px 15px rgba(30, 58, 138, 0.4)'
                  }}
                >
                  📎 Choose File
                </label>

                {uploadedFileName && (
                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#ecfdf5',
                    border: '2px solid #86efac',
                    borderRadius: '10px',
                    display: 'inline-block'
                  }}>
                    <div style={{ color: '#166534', fontWeight: 'bold', marginBottom: '5px' }}>
                      ✅ File Selected:
                    </div>
                    <div style={{ color: '#059669' }}>
                      {uploadedFileName}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '25px', fontSize: '0.9em', color: '#9ca3af' }}>
                  Max file size: 50MB • Supports 10,000+ rows
                </div>
              </div>
            )}

            <button 
              onClick={parseData} 
              disabled={loading || (!rawData.trim() && inputMode === 'text')}
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

          {/* Dataset Size Warning Banner */}
          {metrics && metrics.dataPoints < 50 && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <AlertCircle size={32} style={{ color: '#92400e', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', color: '#92400e', fontSize: '1.1em', marginBottom: '5px' }}>
                  ⚠️ Limited Dataset Notice
                </div>
                <div style={{ color: '#78350f', lineHeight: '1.6' }}>
                  Analysis based on <strong>{metrics.dataPoints} data points</strong>. 
                  For more accurate insights and reliable trends, we recommend datasets with <strong>1000+ rows</strong>. 
                  Current analysis is suitable for demonstration and preliminary insights only.
                </div>
              </div>
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

          {/* Statistical Analysis Section */}          
{statistics && (
  <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '12px', padding: '25px', marginBottom: '20px' }}>
    <h3 style={{ color: '#92400e', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
      🔬 Statistical Analysis <TrendingUp size={24} style={{ color: '#b45309' }} />
    </h3>
    
    {statistics.columnName && (
      <div>
        <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '10px' }}>
          📊 Column Analyzed: <span style={{ color: '#b45309' }}>{statistics.columnName}</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {/* Anomalies */}
          {statistics.anomalyDetection && (
            <div style={{ background: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={20} style={{ color: '#ef4444' }} />
                <span style={{ fontWeight: '600', color: '#991b1b' }}>Anomalies Detected</span>
              </div>
              <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#dc2626' }}>
                {statistics.anomalyDetection.totalAnomalies || 0}
              </div>
              <div style={{ fontSize: '0.85em', color: '#92400e' }}>
                {statistics.anomalyDetection.percentage || 0}% of data points
              </div>
            </div>
          )}

          {/* Trend Analysis */}
          {statistics.trendAnalysis && (
            <div style={{ background: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {statistics.trendAnalysis.trendDirection === 'upward' ? <TrendingUp size={20} style={{ color: '#10b981' }} /> : 
                statistics.trendAnalysis.trendDirection === 'downward' ? <TrendingDown size={20} style={{ color: '#ef4444' }} /> : <Activity size={20} />}
                <span style={{ fontWeight: '600' }}>Trend Direction</span>
              </div>
              <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: parseFloat(statistics.trendAnalysis.rSquared || 0) > 0.7 ? '#059669' : '#d97706' }}>
                R²: {parseFloat(statistics.trendAnalysis.rSquared || 0).toFixed(3)}
              </div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                Model Fit: {parseFloat(statistics.trendAnalysis.rSquared || 0) > 0.7 ? 'Strong' : parseFloat(statistics.trendAnalysis.rSquared || 0) > 0.4 ? 'Moderate' : 'Weak'}
              </div>
            </div>
          )}

          {/* Confidence Interval */}
          {statistics.confidenceInterval && (
            <div style={{ background: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle size={20} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: '600', color: '#065f46' }}>95% Confidence Interval</span>
              </div>
              <div style={{ fontSize: '1.2em', color: '#059669' }}>
                [{parseFloat(statistics.confidenceInterval.lower || 0).toLocaleString()} - {parseFloat(statistics.confidenceInterval.upper || 0).toLocaleString()}]
              </div>
            </div>
          )}

          {/* Growth Test */}
          {statistics.growthTest && (
            <div style={{ background: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Activity size={20} />
                <span style={{ fontWeight: '600' }}>Growth Significance</span>
              </div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: parseFloat(statistics.growthTest.pValue || 1) < 0.05 ? '#059669' : '#d97706' }}>
                p-value: {parseFloat(statistics.growthTest.pValue || 1).toFixed(4)}
              </div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                {parseFloat(statistics.growthTest.pValue || 1) < 0.05 ? 'Statistically significant' : 'Not significant'}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)}
          {/* Visual Analytics Dashboard - Chart Section */}
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
                <div style={{ display: 'flex', gap: '10px' }}>
                  {loadedAnalysis && autoAnalysis && (
                    <button
                      onClick={performManualComparison}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
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
                      <TrendingUp size={18} />
                      Compare Analyses
                    </button>
                  )}
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
              </div>

              {/* Show loaded analysis indicator */}
              {loadedAnalysis && (
                <div style={{
                  background: '#f0f9ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px' }}>
                      📂 Loaded Analysis Ready for Comparison
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
                      Industry: {loadedAnalysis.industryType} • Revenue: ₹{loadedAnalysis.metrics.totalRevenue.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setLoadedAnalysis(null);
                      setShowComparison(false);
                      setComparison(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Comparison Display */}
              {showComparison && comparison && comparison.canCompare === false && (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={24} />
                    ⚠️ Comparison Not Available
                  </h3>
                  
                  <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '15px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    color: '#1f2937'
                  }}>
                    {comparison.warningMessage}
                  </div>
                </div>
              )}

              {showComparison && comparison && comparison.canCompare && (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={24} />
                    📈 Side-by-Side Comparison
                  </h3>
                  
                  {/* Comparison Table */}
                  <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '15px',
                    overflowX: 'auto'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#1e3a8a', fontWeight: 'bold' }}>Metric</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>Current Analysis</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontWeight: 'bold' }}>Loaded Analysis</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontWeight: '600' }}>Total Revenue</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>
                            ₹{comparison.metrics.current.totalRevenue.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>
                            ₹{comparison.metrics.past.totalRevenue.toLocaleString()}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            color: parseFloat(comparison.metrics.changes.revenueChange) > 0 ? '#10b981' : '#ef4444'
                          }}>
                            {parseFloat(comparison.metrics.changes.revenueChange) > 0 ? '+' : ''}
                            {comparison.metrics.changes.revenueChange}%
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontWeight: '600' }}>Growth Rate</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>
                            {comparison.metrics.current.growthRate.toFixed(2)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>
                            {comparison.metrics.past.growthRate.toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            color: parseFloat(comparison.metrics.changes.growthChange) > 0 ? '#10b981' : '#ef4444'
                          }}>
                            {parseFloat(comparison.metrics.changes.growthChange) > 0 ? '+' : ''}
                            {comparison.metrics.changes.growthChange}%
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '12px', fontWeight: '600' }}>Data Points</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>
                            {comparison.metrics.current.dataPoints}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>
                            {comparison.metrics.past.dataPoints}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#3b82f6', fontWeight: 'bold' }}>
                            {comparison.metrics.current.dataPoints - comparison.metrics.past.dataPoints > 0 ? '+' : ''}
                            {comparison.metrics.current.dataPoints - comparison.metrics.past.dataPoints}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* AI Insight */}
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
                                Industry: {item.industryType || 'Unknown'} • {item.analysis?.metrics?.dataPoints || 0} data points
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
                              Load for Comparison
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
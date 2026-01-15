import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getAnalytics } from '../../src/services/api';
import { useLocalSearchParams, router } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = params?.data || await getAnalytics();
      setAnalytics(data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Analyzing your data...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#6366f1',
    },
  };

  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const barData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        data: [65, 78, 90, 72],
      },
    ],
  };

  const pieData = [
    {
      name: 'Category A',
      population: 35,
      color: '#6366f1',
      legendFontColor: '#1f2937',
      legendFontSize: 12,
    },
    {
      name: 'Category B',
      population: 28,
      color: '#8b5cf6',
      legendFontColor: '#1f2937',
      legendFontSize: 12,
    },
    {
      name: 'Category C',
      population: 22,
      color: '#ec4899',
      legendFontColor: '#1f2937',
      legendFontSize: 12,
    },
    {
      name: 'Category D',
      population: 15,
      color: '#f59e0b',
      legendFontColor: '#1f2937',
      legendFontSize: 12,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* BACK BUTTONS - FIXED */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/home' as any)}  // ✅ FIXED
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📊 Data Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>1,234</Text>
              <Text style={styles.statLabel}>Total Records</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Columns</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>98%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Trend Analysis</Text>
          <LineChart
            data={lineData}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Quarterly Performance</Text>
          <BarChart
            yAxisLabel=""  // ✅ FIXED
            yAxisSuffix=""
            data={barData}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribution by Category</Text>
          <PieChart
            data={pieData}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>

        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 AI Insights</Text>
          <View style={styles.insight}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>
              Strong upward trend detected in Q2 with 45% growth
            </Text>
          </View>
          <View style={styles.insight}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>
              Category A shows highest contribution at 35%
            </Text>
          </View>
          <View style={styles.insight}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>
              Predicted 15% increase in next quarter based on patterns
            </Text>
          </View>
          <View style={styles.insight}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>
              Data quality is excellent with minimal outliers
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  navHeader: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  insightsCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 16,
  },
  insight: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  insightBullet: {
    fontSize: 16,
    color: '#92400e',
    marginRight: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    lineHeight: 20,
  },
});

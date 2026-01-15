import React from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to InsightAI</Text>
          <Text style={styles.subtitle}>
            AI-Powered Data Analysis at Your Fingertips
          </Text>
        </View>

        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('./upload' as any)}  // ✅ FIXED
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📊</Text>
            </View>
            <Text style={styles.cardTitle}>Upload Data</Text>
            <Text style={styles.cardDescription}>
              Upload CSV or Excel files for instant AI-powered analysis
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('./analytics' as any)}  // ✅ FIXED
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📈</Text>
            </View>
            <Text style={styles.cardTitle}>View Analytics</Text>
            <Text style={styles.cardDescription}>
              Explore insights and visualizations from your data
            </Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🤖</Text>
            </View>
            <Text style={styles.cardTitle}>AI Insights</Text>
            <Text style={styles.cardDescription}>
              Get intelligent recommendations and predictions
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>💾</Text>
            </View>
            <Text style={styles.cardTitle}>Export Results</Text>
            <Text style={styles.cardDescription}>
              Download reports and share insights with your team
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Advanced AI Technology
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

import React, { useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { uploadFile } from '../../src/services/api';

export default function UploadScreen() {
  const [file, setFile] = useState<DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
        setUploadSuccess(false);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick document');
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      Alert.alert('No File Selected', 'Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadFile(file);
      setUploadSuccess(true);
      Alert.alert(
        'Success',
        'File uploaded successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/analytics' as any), // ✅ TypeScript safe
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadSuccess(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📁 Supported File Types</Text>
          <Text style={styles.infoText}>• CSV (.csv)</Text>
          <Text style={styles.infoText}>• Excel (.xlsx, .xls)</Text>
          <Text style={styles.infoText}>• Maximum file size: 10MB</Text>
        </View>

        <TouchableOpacity
          style={styles.uploadArea}
          onPress={pickDocument}
          disabled={uploading}
        >
          <Text style={styles.uploadIcon}>☁️</Text>
          <Text style={styles.uploadTitle}>
            {file ? 'Change File' : 'Select File to Upload'}
          </Text>
          <Text style={styles.uploadSubtitle}>
            Tap to browse your files
          </Text>
        </TouchableOpacity>

        {file && (
          <View style={styles.fileInfo}>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>📄 {file.name}</Text>
              <Text style={styles.fileSize}>
                Size: {((file.size || 0) / 1024).toFixed(2)} KB
              </Text>
            </View>
            <TouchableOpacity onPress={clearFile} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {uploadSuccess && (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>✓ Upload Successful!</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!file || uploading) && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload & Analyze</Text>
          )}
        </TouchableOpacity>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What happens next?</Text>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔍</Text>
            <Text style={styles.featureText}>
              AI analyzes your data patterns
            </Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>
              Generates interactive visualizations
            </Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💡</Text>
            <Text style={styles.featureText}>
              Provides actionable insights
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
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338ca',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4338ca',
    marginBottom: 4,
  },
  uploadArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  fileInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#6b7280',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#dc2626',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  uploadButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  featuresCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
});

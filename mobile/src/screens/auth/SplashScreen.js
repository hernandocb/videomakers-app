import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SIZES } from '../../utils/constants';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🎥</Text>
        </View>
        <Text style={styles.title}>Videomakers</Text>
        <Text style={styles.subtitle}>O Uber dos Videomakers</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
  },
  iconText: {
    fontSize: 60,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SIZES.base,
  },
  subtitle: {
    fontSize: SIZES.h5,
    color: COLORS.white,
    opacity: 0.9,
  },
});

export default SplashScreen;

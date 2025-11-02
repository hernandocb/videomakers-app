import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, SIZES } from '../../utils/constants';

const ChatListScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversas</Text>
      </View>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    padding: SIZES.padding * 2,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.black,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.gray[500],
  },
});

export default ChatListScreen;

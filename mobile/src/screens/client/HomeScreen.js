import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
// CORREÇÃO: Importado de 'react-native-safe-area-context'
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersAPI } from '../../services/api';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SIZES } from '../../utils/constants';

const HomeScreen = () => {
  const [videomakers, setVideomakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideomakers();
  }, []);

  const loadVideomakers = async () => {
    try {
      // Localização de exemplo (São Paulo)
      const { data } = await usersAPI.getVideomakers({
        latitude: -23.5505,
        longitude: -46.6333,
        max_distance_km: 50,
      });
      setVideomakers(data);
    } catch (error) {
      console.error('HomeScreen.js:34 Error loading videomakers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVideomakers();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Videomakers Disponíveis</Text>
        <Text style={styles.subtitle}>{videomakers.length} encontrados próximos a você</Text>
      </View>

      <FlatList
        data={videomakers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.nome.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.nome}</Text>
                <Text style={styles.cardLocation}>
                  {item.cidade}, {item.estado}
                </Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>
                    ⭐ {item.rating_medio.toFixed(1)}
                  </Text>
                  <Text style={styles.ratingCount}>
                    ({item.total_avaliacoes} avaliações)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nenhum videomaker encontrado próximo a você
            </Text>
          </View>
        }
      />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SIZES.base / 2,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
  },
  list: {
    padding: SIZES.padding,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  avatarText: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.warning,
    marginRight: 4,
  },
  ratingCount: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
  },
  emptyContainer: {
    padding: SIZES.padding * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});

export default HomeScreen;

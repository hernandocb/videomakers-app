import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
// ✅ CORREÇÃO: Importado de 'react-native-safe-area-context'
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import { jobsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SIZES, JOB_CATEGORIES } from '../../utils/constants';
import { calculateDistance } from '../../utils/helpers';

const FeedScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    categoria: 'all',
    maxDistance: user?.raio_atuacao_km || 50,
    minBudget: 0,
  });

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, filters]);

  const loadJobs = async () => {
    try {
      const { data } = await jobsAPI.list({ status: 'open' });
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Filtro de categoria
    if (filters.categoria !== 'all') {
      filtered = filtered.filter(job => job.categoria === filters.categoria);
    }

    // Filtro de distância (se usuário tem localização)
    if (user?.latitude && user?.longitude) {
      filtered = filtered.filter(job => {
        if (!job.local?.latitude || !job.local?.longitude) return true;
        const distance = calculateDistance(
          user.latitude,
          user.longitude,
          job.local.latitude,
          job.local.longitude
        );
        return distance <= filters.maxDistance;
      });
    }

    // Filtro de orçamento mínimo
    if (filters.minBudget > 0) {
      filtered = filtered.filter(job => 
        (job.valor_minimo_sugerido || 0) >= filters.minBudget
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleJobPress = (job) => {
    // ✅ CORREÇÃO: Passando o objeto 'job' inteiro em vez de apenas o 'jobId'
    navigation.getParent()?.navigate('JobDetails', { job: job });
  };

  const resetFilters = () => {
    setFilters({
      categoria: 'all',
      maxDistance: user?.raio_atuacao_km || 50,
      minBudget: 0,
    });
    setShowFilters(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Jobs Disponíveis</Text>
          <Text style={styles.subtitle}>
            {filteredJobs.length} de {jobs.length} jobs
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.headerButtonText}>🔍 Filtros</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowMap(!showMap)}
          >
            <Text style={styles.headerButtonText}>
              {showMap ? '📋 Lista' : '🗺️ Mapa'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showMap ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: user?.latitude || -23.5505,
            longitude: user?.longitude || -46.6333,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
        >
          {/* User location */}
          {user?.latitude && user?.longitude && (
            <>
              <Marker
                coordinate={{
                  latitude: user.latitude,
                  longitude: user.longitude,
                }}
                title="Você está aqui"
                pinColor={COLORS.primary}
              />
              <Circle
                center={{
                  latitude: user.latitude,
                  longitude: user.longitude,
                }}
                radius={filters.maxDistance * 1000}
                fillColor="rgba(14, 118, 255, 0.2)"
                strokeColor={COLORS.primary}
                strokeWidth={2}
              />
            </>
          )}

          {/* Job markers */}
          {filteredJobs.map((job) => {
            if (!job.local?.latitude || !job.local?.longitude) return null;
            return (
              <Marker
                key={job.id}
                coordinate={{
                  latitude: job.local.latitude,
                  longitude: job.local.longitude,
                }}
                title={job.titulo}
                description={`R$ ${job.valor_minimo_sugerido || 0}`}
                onPress={() => handleJobPress(job)}
              />
            );
          })}
        </MapView>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => handleJobPress(item)}
              showDistance
              userLocation={
                user?.latitude && user?.longitude
                  ? { latitude: user.latitude, longitude: user.longitude }
                  : null
              }
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhum job encontrado com os filtros aplicados
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Limpar Filtros</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContainer}>
              {/* Categoria */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Categoria</Text>
                <View style={styles.categoryButtons}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      filters.categoria === 'all' && styles.categoryButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, categoria: 'all' })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        filters.categoria === 'all' && styles.categoryButtonTextActive,
                      ]}
                    >
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {JOB_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryButton,
                        filters.categoria === cat.value && styles.categoryButtonActive,
                      ]}
                      onPress={() => setFilters({ ...filters, categoria: cat.value })}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          filters.categoria === cat.value && styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Distância */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>
                  Distância máxima: {filters.maxDistance} km
                </Text>
                <View style={styles.distanceButtons}>
                  {[10, 25, 50, 100, 200].map((distance) => (
                    <TouchableOpacity
                      key={distance}
                      style={[
                        styles.distanceButton,
                        filters.maxDistance === distance && styles.distanceButtonActive,
                      ]}
                      onPress={() => setFilters({ ...filters, maxDistance: distance })}
                    >
                      <Text
                        style={[
                          styles.distanceButtonText,
                          filters.maxDistance === distance && styles.distanceButtonTextActive,
                        ]}
                      >
                        {distance}km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Orçamento Mínimo */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Orçamento mínimo (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={filters.minBudget.toString()}
                  onChangeText={(text) =>
                    setFilters({ ...filters, minBudget: parseInt(text) || 0 })
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetFilters}
              >
                <Text style={styles.clearButtonText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerButtons: {
    flexDirection: 'row',
    gap: SIZES.base,
  },
  headerButton: {
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.padding,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
  },
  headerButtonText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  list: {
    padding: SIZES.padding,
  },
  emptyContainer: {
    padding: SIZES.padding * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: SIZES.padding,
  },
  resetButton: {
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding * 2,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding * 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.black,
  },
  modalClose: {
    fontSize: SIZES.h3,
    color: COLORS.gray[600],
  },
  filtersContainer: {
    padding: SIZES.padding * 2,
  },
  filterSection: {
    marginBottom: SIZES.padding * 2,
  },
  filterLabel: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.padding,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.base,
  },
  categoryButton: {
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.padding,
    backgroundColor: COLORS.gray[100],
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: SIZES.small,
    color: COLORS.gray[700],
  },
  categoryButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  distanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.gray[100],
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginHorizontal: SIZES.base / 2,
  },
  distanceButtonActive: {
    backgroundColor: COLORS.primary,
  },
  distanceButtonText: {
    fontSize: SIZES.small,
    color: COLORS.gray[700],
  },
  distanceButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    fontSize: SIZES.font,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  modalActions: {
    flexDirection: 'row',
    padding: SIZES.padding * 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: SIZES.padding,
  },
  clearButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.gray[200],
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.gray[700],
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
});

export default FeedScreen;

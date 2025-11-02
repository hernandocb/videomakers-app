import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { jobsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SIZES } from '../../utils/constants';
import Icon from 'react-native-vector-icons/Ionicons';

const MyJobsClientScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data } = await jobsAPI.list({ client_id: user.id });
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return COLORS.primary;
      case 'in_progress':
        return COLORS.warning;
      case 'completed':
        return COLORS.success;
      case 'cancelled':
        return COLORS.danger;
      default:
        return COLORS.gray[500];
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Progresso';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleViewProposals = (jobId) => {
    navigation.getParent()?.navigate('Proposals', { jobId });
  };

  const renderJob = ({ item }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => handleViewProposals(item.id)}
    >
      <View style={styles.jobHeader}>
        <View style={styles.flex1}>
          <Text style={styles.jobTitle}>{item.titulo}</Text>
          <Text style={styles.jobDate}>
            Criado em: {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.jobDescription} numberOfLines={2}>
        {item.descricao}
      </Text>

      <View style={styles.jobFooter}>
        <View style={styles.footerItem}>
          <Icon name="calendar-outline" size={16} color={COLORS.gray[600]} />
          <Text style={styles.footerText}>
            {new Date(item.data_gravacao).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Icon name="time-outline" size={16} color={COLORS.gray[600]} />
          <Text style={styles.footerText}>{item.duracao_horas}h</Text>
        </View>
        <View style={styles.footerItem}>
          <Icon name="cash-outline" size={16} color={COLORS.success} />
          <Text style={[styles.footerText, styles.priceText]}>
            R$ {item.valor_minimo_sugerido?.toFixed(2)}
          </Text>
        </View>
      </View>

      {item._proposalCount && (
        <View style={styles.proposalBadge}>
          <Icon name="mail-outline" size={16} color={COLORS.primary} />
          <Text style={styles.proposalText}>
            {item._proposalCount} proposta{item._proposalCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Jobs</Text>
        <Text style={styles.headerSubtitle}>{jobs.length} job{jobs.length !== 1 ? 's' : ''}</Text>
      </View>

      {jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="briefcase-outline" size={64} color={COLORS.gray[400]} />
          <Text style={styles.emptyText}>Nenhum job criado ainda</Text>
          <Text style={styles.emptySubtext}>
            Crie seu primeiro job na aba "Novo Job"
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  listContent: {
    padding: SIZES.padding,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    marginBottom: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.padding,
  },
  flex1: {
    flex: 1,
    marginRight: SIZES.padding,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  jobDate: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  statusBadge: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base / 2,
    borderRadius: SIZES.radius,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  jobDescription: {
    fontSize: 14,
    color: COLORS.gray[700],
    marginBottom: SIZES.padding,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  priceText: {
    fontWeight: '700',
    color: COLORS.success,
  },
  proposalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.padding,
    paddingTop: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    gap: 6,
  },
  proposalText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 3,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[600],
    marginTop: SIZES.padding * 2,
    marginBottom: SIZES.base,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});

export default MyJobsClientScreen;

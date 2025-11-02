import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { proposalsAPI, jobsAPI } from '../../services/api';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/helpers';

const ProposalsScreen = ({ navigation }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      // Get all jobs from client
      const { data: jobs } = await jobsAPI.list({ role: 'client' });
      
      // Get proposals for each job
      const allProposals = [];
      for (const job of jobs) {
        const { data: jobProposals } = await proposalsAPI.getByJob(job.id);
        allProposals.push(...jobProposals.map(p => ({ ...p, job })));
      }
      
      setProposals(allProposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProposals();
  };

  const handleAcceptProposal = (proposal) => {
    Alert.alert(
      'Aceitar Proposta',
      `Deseja aceitar a proposta de ${formatCurrency(proposal.valor_proposto)}?\n\nVocê será redirecionado para a tela de pagamento.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setActionLoading(proposal.id);
            try {
              await proposalsAPI.accept(proposal.id);
              
              // Navigate to payment screen
              navigation.navigate('Payment', {
                proposal,
                job: proposal.job,
              });
              
              await loadProposals();
            } catch (error) {
              Alert.alert(
                'Erro',
                error.response?.data?.detail || 'Não foi possível aceitar a proposta'
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectProposal = (proposal) => {
    Alert.alert(
      'Rejeitar Proposta',
      `Tem certeza que deseja rejeitar a proposta de ${proposal.videomaker_nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(proposal.id);
            try {
              await proposalsAPI.reject(proposal.id);
              Alert.alert('Sucesso', 'Proposta rejeitada');
              await loadProposals();
            } catch (error) {
              Alert.alert(
                'Erro',
                error.response?.data?.detail || 'Não foi possível rejeitar a proposta'
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'accepted':
        return COLORS.success;
      case 'rejected':
        return COLORS.danger;
      default:
        return COLORS.gray[400];
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'accepted':
        return 'Aceita';
      case 'rejected':
        return 'Rejeitada';
      default:
        return status;
    }
  };

  const renderProposal = ({ item }) => (
    <View style={styles.proposalCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.videomaker_nome?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.videomakerName}>{item.videomaker_nome}</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color={COLORS.warning} />
              <Text style={styles.ratingText}>
                {item.videomaker_rating?.toFixed(1) || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      {/* Job Info */}
      <View style={styles.jobInfo}>
        <Text style={styles.jobLabel}>Job:</Text>
        <Text style={styles.jobTitle}>{item.job?.titulo}</Text>
      </View>

      {/* Proposal Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Icon name="cash-outline" size={18} color={COLORS.success} />
          <Text style={styles.detailLabel}>Valor:</Text>
          <Text style={styles.priceValue}>{formatCurrency(item.valor_proposto)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="time-outline" size={18} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Prazo:</Text>
          <Text style={styles.detailValue}>{item.prazo_entrega_dias} dias</Text>
        </View>
      </View>

      {/* Message */}
      {item.mensagem && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Mensagem:</Text>
          <Text style={styles.messageText}>{item.mensagem}</Text>
        </View>
      )}

      {/* Actions */}
      {item.status === 'pending' && (
        <View style={styles.actionsContainer}>
          {actionLoading === item.id ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectProposal(item)}
              >
                <Text style={styles.rejectButtonText}>Rejeitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptProposal(item)}
              >
                <Text style={styles.acceptButtonText}>Aceitar e Pagar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <Text style={styles.timestamp}>Recebida em {formatDate(item.created_at)}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Propostas Recebidas</Text>
        <Text style={styles.subtitle}>{proposals.length} propostas</Text>
      </View>

      <FlatList
        data={proposals}
        renderItem={renderProposal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={80} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>Nenhuma proposta ainda</Text>
            <Text style={styles.emptyText}>
              Quando videomakers enviarem propostas para seus jobs, elas aparecerão aqui
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  proposalCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  avatarText: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  videomakerName: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: SIZES.small,
    color: COLORS.gray[600],
    marginLeft: 4,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: SIZES.padding,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  jobInfo: {
    marginBottom: SIZES.padding,
    paddingBottom: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  jobLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.black,
  },
  detailsContainer: {
    marginBottom: SIZES.padding,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  detailLabel: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginLeft: SIZES.base,
    marginRight: SIZES.base,
  },
  detailValue: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.black,
  },
  priceValue: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.success,
  },
  messageContainer: {
    backgroundColor: COLORS.gray[50],
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
  },
  messageLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SIZES.base / 2,
  },
  messageText: {
    fontSize: SIZES.body,
    color: COLORS.gray[700],
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.padding,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.gray[200],
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginRight: SIZES.base,
  },
  rejectButtonText: {
    color: COLORS.gray[700],
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.success,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginLeft: SIZES.base,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 4,
  },
  emptyTitle: {
    fontSize: SIZES.h3,
    fontWeight: '600',
    color: COLORS.gray[600],
    marginTop: SIZES.padding * 2,
    marginBottom: SIZES.base,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ProposalsScreen;

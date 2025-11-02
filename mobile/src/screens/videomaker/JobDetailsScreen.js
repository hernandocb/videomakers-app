import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { jobsAPI, proposalsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';
import { formatCurrency, formatDate, calculateDistance } from '../../utils/helpers';

const JobDetailsScreen = ({ route, navigation }) => {
  // ✅ CORREÇÃO: Recebe o objeto 'job' inteiro, não apenas o 'jobId'
  const { job: jobFromParams } = route.params;
  const { user } = useAuth();
  
  // ✅ CORREÇÃO: Usa o 'job' dos parâmetros como estado inicial. Não precisamos de 'loading'.
  const [job, setJob] = useState(jobFromParams);
  
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({
    valor_proposto: '',
    prazo_entrega_dias: '',
    mensagem: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ✅ CORREÇÃO: O 'useEffect' e 'loadJob' foram removidos, pois não fazemos mais fetch.
  // O 'job' já tem toda a informação que a lista (FeedScreen) tinha.

  const handleSubmitProposal = async () => {
    if (!proposalData.valor_proposto || !proposalData.prazo_entrega_dias) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    const valor = parseFloat(proposalData.valor_proposto);
    if (isNaN(valor) || valor <= 0) {
      Alert.alert('Erro', 'Valor proposto inválido');
      return;
    }

    setSubmitting(true);
    try {
      await proposalsAPI.create({
        job_id: job.id, // Usar job.id
        valor_proposto: valor,
        prazo_entrega_dias: parseInt(proposalData.prazo_entrega_dias),
        mensagem: proposalData.mensagem,
      });

      Alert.alert('Sucesso!', 'Proposta enviada com sucesso', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      // ✅ CORREÇÃO: Garante que a mensagem de erro seja sempre uma string
      let errorMessage = 'Não foi possível enviar a proposta';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Pega a primeira mensagem se for um array
          errorMessage = error.response.data.detail[0].msg || 'Erro de validação';
        } else {
          // Usa a mensagem se for uma string
          errorMessage = error.response.data.detail;
        }
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const distance =
    user?.latitude &&
    user?.longitude &&
    job?.local?.latitude &&
    job?.local?.longitude
      ? calculateDistance(
          user.latitude,
          user.longitude,
          job.local.latitude,
          job.local.longitude
        )
      : null;

  // ✅ CORREÇÃO: Removido o 'loading' state
  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Job não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes do Job</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Title and Status */}
        <View style={styles.section}>
          <Text style={styles.title}>{job.titulo}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {job.status === 'open' ? 'Aberto' : job.status}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{job.descricao}</Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          
          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={20} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Data da Gravação</Text>
              <Text style={styles.detailValue}>{formatDate(job.data_gravacao)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="time-outline" size={20} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Duração</Text>
              <Text style={styles.detailValue}>{job.duracao_horas} horas</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="pricetag-outline" size={20} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Categoria</Text>
              <Text style={styles.detailValue}>{job.categoria}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="cash-outline" size={20} color={COLORS.success} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Valor Mínimo Sugerido</Text>
              <Text style={[styles.detailValue, styles.priceValue]}>
                {formatCurrency(job.valor_minimo_sugerido || 0)}
              </Text>
            </View>
          </View>

          {distance && (
            <View style={styles.detailRow}>
              <Icon name="navigate-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Distância</Text>
                <Text style={styles.detailValue}>{distance} km de você</Text>
              </View>
            </View>
          )}
        </View>

        {/* Extras */}
        {job.extras && job.extras.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extras Solicitados</Text>
            {job.extras.map((extra, index) => (
              <View key={index} style={styles.extraItem}>
                <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.extraText}>{extra}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Location Map */}
        {job.local?.latitude && job.local?.longitude && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localização</Text>
            <Text style={styles.locationText}>
              {job.local.endereco}
              {'\n'}
              {job.local.cidade}, {job.local.estado}
            </Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: job.local.latitude,
                longitude: job.local.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker
                coordinate={{
                  latitude: job.local.latitude,
                  longitude: job.local.longitude,
                }}
                title={job.titulo}
              />
            </MapView>
          </View>
        )}

        {/* Proposal Form */}
        {user?.role === 'videomaker' && job.status === 'open' && (
          <View style={styles.section}>
            {!showProposalForm ? (
              <CustomButton
                title="Enviar Proposta"
                onPress={() => setShowProposalForm(true)}
              />
            ) : (
              <View style={styles.proposalForm}>
                <Text style={styles.sectionTitle}>Sua Proposta</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Valor Proposto (R$) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 500"
                    keyboardType="numeric"
                    value={proposalData.valor_proposto}
                    onChangeText={(text) =>
                      setProposalData({ ...proposalData, valor_proposto: text })
                    }
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Prazo de Entrega (dias) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 7"
                    keyboardType="numeric"
                    value={proposalData.prazo_entrega_dias}
                    onChangeText={(text) =>
                      setProposalData({ ...proposalData, prazo_entrega_dias: text })
                    }
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Mensagem (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Explique porque você é o profissional ideal para este job..."
                    multiline
                    numberOfLines={4}
                    value={proposalData.mensagem}
                    onChangeText={(text) =>
                      setProposalData({ ...proposalData, mensagem: text })
                    }
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowProposalForm(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <CustomButton
                    title="Enviar Proposta"
                    onPress={handleSubmitProposal}
                    loading={submitting}
                    style={styles.submitButton}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: SIZES.padding * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding * 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
  },
  section: {
    padding: SIZES.padding * 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SIZES.padding,
  },
  statusBadge: {
    backgroundColor: COLORS.success,
    paddingVertical: SIZES.base / 2,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.padding,
  },
  description: {
    fontSize: SIZES.body,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.padding,
  },
  detailContent: {
    marginLeft: SIZES.padding,
    flex: 1,
  },
  detailLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: SIZES.body,
    color: COLORS.black,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: SIZES.h4,
    color: COLORS.success,
    fontWeight: '700',
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  extraText: {
    fontSize: SIZES.body,
    color: COLORS.gray[700],
    marginLeft: SIZES.base,
  },
  locationText: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginBottom: SIZES.padding,
    lineHeight: 20,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.radius,
  },
  proposalForm: {
    marginTop: SIZES.padding,
  },
  inputContainer: {
    marginBottom: SIZES.padding * 1.5,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.base,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    fontSize: SIZES.font,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.padding,
    gap: SIZES.padding,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.gray[200],
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.gray[700],
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
  },
});

export default JobDetailsScreen;

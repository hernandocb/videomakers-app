import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { paymentsAPI } from '../../services/api';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';
import { formatCurrency } from '../../utils/helpers';

const PaymentScreen = ({ route, navigation }) => {
  const { proposal, job } = route.params;
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const valorTotal = proposal.valor_proposto;
  const comissao = valorTotal * 0.20; // 20% commission
  const valorVideomaker = valorTotal - comissao;

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handlePayment = async () => {
    // Validate card data
    if (!cardData.cardNumber || !cardData.expiryDate || !cardData.cvv || !cardData.cardholderName) {
      Alert.alert('Erro', 'Preencha todos os dados do cartão');
      return;
    }

    const cardNumber = cardData.cardNumber.replace(/\s/g, '');
    if (cardNumber.length !== 16) {
      Alert.alert('Erro', 'Número do cartão inválido');
      return;
    }

    if (cardData.cvv.length < 3) {
      Alert.alert('Erro', 'CVV inválido');
      return;
    }

    setLoading(true);

    try {
      // In a real app, we would:
      // 1. Tokenize card with Stripe SDK
      // 2. Send token to backend
      // For now, we'll simulate the payment
      
      const { data } = await paymentsAPI.hold({
        proposal_id: proposal.id,
        job_id: job.id,
        valor: valorTotal,
        payment_method: 'card', // In production, use Stripe token
      });

      Alert.alert(
        'Pagamento Realizado!',
        `O valor de ${formatCurrency(valorTotal)} foi retido e será liberado ao videomaker após a conclusão do trabalho.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Erro no Pagamento',
        error.response?.data?.detail || 'Não foi possível processar o pagamento'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pagamento</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Job Info */}
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{job.titulo}</Text>
          <View style={styles.jobDetail}>
            <Icon name="person-outline" size={18} color={COLORS.gray[600]} />
            <Text style={styles.jobDetailText}>Proposta de: {proposal.videomaker_nome}</Text>
          </View>
          <View style={styles.jobDetail}>
            <Icon name="time-outline" size={18} color={COLORS.gray[600]} />
            <Text style={styles.jobDetailText}>
              Prazo: {proposal.prazo_entrega_dias} dias
            </Text>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Resumo do Pagamento</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor da Proposta</Text>
            <Text style={styles.summaryValue}>{formatCurrency(valorTotal)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelSmall}>Taxa da Plataforma (20%)</Text>
            <Text style={styles.summaryValueSmall}>- {formatCurrency(comissao)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelSmall}>Valor para o Videomaker</Text>
            <Text style={styles.summaryValueSmall}>{formatCurrency(valorVideomaker)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total a Pagar</Text>
            <Text style={styles.totalValue}>{formatCurrency(valorTotal)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.infoCard}>
          <Icon name="shield-checkmark-outline" size={24} color={COLORS.success} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Pagamento Seguro (Escrow)</Text>
            <Text style={styles.infoText}>
              O valor será retido e só será liberado ao videomaker após você confirmar a conclusão do trabalho.
            </Text>
          </View>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Dados do Cartão</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Número do Cartão</Text>
            <TextInput
              style={styles.input}
              placeholder="0000 0000 0000 0000"
              keyboardType="numeric"
              value={cardData.cardNumber}
              onChangeText={(text) =>
                setCardData({ ...cardData, cardNumber: formatCardNumber(text) })
              }
              maxLength={19}
            />
            <Icon
              name="card-outline"
              size={20}
              color={COLORS.gray[400]}
              style={styles.inputIcon}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfInput]}>
              <Text style={styles.inputLabel}>Validade</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                keyboardType="numeric"
                value={cardData.expiryDate}
                onChangeText={(text) =>
                  setCardData({ ...cardData, expiryDate: formatExpiryDate(text) })
                }
                maxLength={5}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfInput]}>
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="000"
                keyboardType="numeric"
                value={cardData.cvv}
                onChangeText={(text) =>
                  setCardData({ ...cardData, cvv: text.replace(/\D/g, '') })
                }
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nome do Titular</Text>
            <TextInput
              style={styles.input}
              placeholder="Como está no cartão"
              value={cardData.cardholderName}
              onChangeText={(text) =>
                setCardData({ ...cardData, cardholderName: text.toUpperCase() })
              }
              autoCapitalize="characters"
            />
          </View>
        </View>

        <CustomButton
          title={loading ? 'Processando...' : `Pagar ${formatCurrency(valorTotal)}`}
          onPress={handlePayment}
          loading={loading}
          style={styles.payButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  scrollContent: {
    paddingBottom: SIZES.padding * 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding * 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding * 2,
    padding: SIZES.padding * 1.5,
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  jobTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.padding,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base / 2,
  },
  jobDetailText: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginLeft: SIZES.base,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
    padding: SIZES.padding * 2,
    borderRadius: SIZES.radius,
  },
  sectionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.padding * 1.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  summaryLabel: {
    fontSize: SIZES.body,
    color: COLORS.black,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: SIZES.body,
    color: COLORS.black,
    fontWeight: '600',
  },
  summaryLabelSmall: {
    fontSize: SIZES.small,
    color: COLORS.gray[600],
  },
  summaryValueSmall: {
    fontSize: SIZES.small,
    color: COLORS.gray[600],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SIZES.padding,
  },
  totalLabel: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.black,
  },
  totalValue: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.success,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.success + '10',
    marginHorizontal: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
    padding: SIZES.padding * 1.5,
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  infoContent: {
    flex: 1,
    marginLeft: SIZES.padding,
  },
  infoTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: SIZES.base / 2,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.gray[700],
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
    padding: SIZES.padding * 2,
    borderRadius: SIZES.radius,
  },
  inputContainer: {
    marginBottom: SIZES.padding * 1.5,
    position: 'relative',
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
  inputIcon: {
    position: 'absolute',
    right: SIZES.padding,
    top: 38,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  payButton: {
    marginHorizontal: SIZES.padding * 2,
  },
});

export default PaymentScreen;

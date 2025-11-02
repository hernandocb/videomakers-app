import React, { useState, useEffect } from 'react'; // Importar useEffect
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { jobsAPI } from '../../services/api';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, JOB_CATEGORIES, EXTRAS } from '../../utils/constants';
import { calculateMinimumValue, formatCurrency } from '../../utils/helpers';

const CreateJobScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: 'evento',
    duracao_horas: '',
    extras: [],
  });
  const [loading, setLoading] = useState(false);
  
  // ✅ CORREÇÃO: Usar estado para o valor do preview
  const [previewValue, setPreviewValue] = useState(0);

  // ✅ CORREÇÃO: Recalcular o preview sempre que o formData mudar
  useEffect(() => {
    const hours = parseFloat(formData.duracao_horas) || 0;
    const selectedExtras = EXTRAS.filter(e => formData.extras.includes(e.value));
    const newValue = calculateMinimumValue(hours, selectedExtras);
    setPreviewValue(newValue);
  }, [formData.duracao_horas, formData.extras]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleExtra = (extraValue) => {
    setFormData(prev => ({
      ...prev,
      extras: prev.extras.includes(extraValue)
        ? prev.extras.filter(e => e !== extraValue)
        : [...prev.extras, extraValue],
    }));
  };

  // Função `calculatePreview` removida daqui, pois agora está no useEffect

  const handleCreate = async () => {
    if (!formData.titulo || !formData.descricao || !formData.duracao_horas) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.create({
        ...formData,
        duracao_horas: parseFloat(formData.duracao_horas),
        data_gravacao: new Date().toISOString(), // TODO: Adicionar seletor de data
        local: { // TODO: Adicionar seletor de localização
          endereco: 'Rua Exemplo, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          latitude: -23.5505,
          longitude: -46.6333,
        },
      });
      Alert.alert('Sucesso', 'Job criado com sucesso!');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao criar job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Criar Novo Job</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Gravação de casamento"
              value={formData.titulo}
              onChangeText={(value) => updateField('titulo', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva os detalhes do job..."
              value={formData.descricao}
              onChangeText={(value) => updateField('descricao', value)}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Duração (horas) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 8"
              value={formData.duracao_horas}
              onChangeText={(value) => updateField('duracao_horas', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Extras</Text>
            {EXTRAS.map((extra) => (
              <TouchableOpacity
                key={extra.value}
                style={[
                  styles.extraItem,
                  formData.extras.includes(extra.value) && styles.extraItemActive,
                ]}
                onPress={() => toggleExtra(extra.value)}
              >
                <Text
                  style={[
                    styles.extraText,
                    formData.extras.includes(extra.value) && styles.extraTextActive,
                  ]}
                >
                  {extra.label} (+{formatCurrency(extra.price)})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Valor Mínimo Calculado:</Text>
            {/* ✅ CORREÇÃO: Lendo o valor do estado */}
            <Text style={styles.previewValue}>{formatCurrency(previewValue)}</Text>
          </View>

          <CustomButton
            title="Publicar Job"
            onPress={handleCreate}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: SIZES.padding * 2,
  },
  header: {
    marginBottom: SIZES.padding * 2,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.black,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: SIZES.padding * 1.5,
  },
  label: {
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
  extraItem: {
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    marginBottom: SIZES.base,
  },
  extraItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  extraText: {
    fontSize: SIZES.body,
    color: COLORS.gray[700],
  },
  extraTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: COLORS.gray[50],
    padding: SIZES.padding * 1.5,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding * 2,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginBottom: SIZES.base,
  },
  previewValue: {
    fontSize: SIZES.h1,
    fontWeight: '700',
    color: COLORS.success,
  },
});

export default CreateJobScreen;

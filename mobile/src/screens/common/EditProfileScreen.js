import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import CustomButton from '../../components/CustomButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SIZES } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';

const EditProfileScreen = ({ navigation }) => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    telefone: user?.telefone || '',
    cidade: user?.cidade || '',
    estado: user?.estado || '',
    raio_atuacao_km: user?.raio_atuacao_km?.toString() || '50',
  });

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    if (!formData.telefone.trim()) {
      Alert.alert('Erro', 'Telefone é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        nome: formData.nome,
        telefone: formData.telefone,
        cidade: formData.cidade,
        estado: formData.estado,
      };

      if (user?.role === 'videomaker') {
        updateData.raio_atuacao_km = parseInt(formData.raio_atuacao_km) || 50;
      }

      const { data } = await usersAPI.updateProfile(updateData);
      setUser(data);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(formData.nome)}</Text>
            </View>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'client' ? 'Cliente' : 'Videomaker'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                value={formData.nome}
                onChangeText={(text) => setFormData({ ...formData, nome: text })}
                placeholder="Seu nome completo"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <TextInput
                style={styles.input}
                value={formData.telefone}
                onChangeText={(text) => setFormData({ ...formData, telefone: text })}
                placeholder="(11) 99999-9999"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Cidade</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cidade}
                  onChangeText={(text) => setFormData({ ...formData, cidade: text })}
                  placeholder="São Paulo"
                  placeholderTextColor={COLORS.gray[400]}
                />
              </View>

              <View style={[styles.inputGroup, styles.flex0]}>
                <Text style={styles.label}>Estado</Text>
                <TextInput
                  style={styles.input}
                  value={formData.estado}
                  onChangeText={(text) => setFormData({ ...formData, estado: text.toUpperCase() })}
                  placeholder="SP"
                  placeholderTextColor={COLORS.gray[400]}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {user?.role === 'videomaker' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Raio de Atuação (km)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.raio_atuacao_km}
                  onChangeText={(text) => setFormData({ ...formData, raio_atuacao_km: text })}
                  placeholder="50"
                  placeholderTextColor={COLORS.gray[400]}
                  keyboardType="numeric"
                />
                <Text style={styles.hint}>
                  Define a distância máxima para aceitar jobs
                </Text>
              </View>
            )}

            <Text style={styles.note}>* Campos obrigatórios</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <CustomButton
              title="Salvar Alterações"
              onPress={handleSave}
              loading={loading}
            />
            <CustomButton
              title="Cancelar"
              onPress={() => navigation.goBack()}
              variant="outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SIZES.padding * 3,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 2,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  form: {
    backgroundColor: COLORS.white,
    marginTop: SIZES.padding,
    padding: SIZES.padding * 2,
  },
  inputGroup: {
    marginBottom: SIZES.padding * 1.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SIZES.base,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    fontSize: 16,
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    gap: SIZES.padding,
  },
  flex1: {
    flex: 1,
  },
  flex0: {
    width: 80,
  },
  hint: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: SIZES.base / 2,
  },
  note: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: SIZES.padding,
    fontStyle: 'italic',
  },
  actions: {
    padding: SIZES.padding * 2,
    gap: SIZES.padding,
  },
});

export default EditProfileScreen;

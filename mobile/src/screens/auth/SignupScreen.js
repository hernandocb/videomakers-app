import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';
import { validateEmail, validatePhone } from '../../utils/helpers';

const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
    role: 'client',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    const { nome, email, telefone, password, confirmPassword, role } = formData;

    if (!nome || !email || !telefone || !password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    if (!validatePhone(telefone)) {
      Alert.alert('Erro', 'Telefone inválido');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    setLoading(true);
    const result = await signup({
      nome,
      email,
      telefone,
      password,
      role,
      aceite_lgpd: true,
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erro', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Junte-se à plataforma</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'client' && styles.roleButtonActive,
              ]}
              onPress={() => updateField('role', 'client')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === 'client' && styles.roleButtonTextActive,
                ]}
              >
                Sou Cliente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'videomaker' && styles.roleButtonActive,
              ]}
              onPress={() => updateField('role', 'videomaker')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === 'videomaker' && styles.roleButtonTextActive,
                ]}
              >
                Sou Videomaker
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              placeholder="João Silva"
              value={formData.nome}
              onChangeText={(value) => updateField('nome', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              placeholder="(11) 99999-9999"
              value={formData.telefone}
              onChangeText={(value) => updateField('telefone', value)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite a senha novamente"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
            />
          </View>

          <CustomButton
            title="Cadastrar"
            onPress={handleSignup}
            loading={loading}
            style={styles.signupButton}
          />

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Já tem conta? <Text style={styles.loginTextBold}>Faça login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding * 2,
  },
  header: {
    marginTop: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SIZES.base,
  },
  subtitle: {
    fontSize: SIZES.h5,
    color: COLORS.gray[600],
  },
  form: {
    flex: 1,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: SIZES.padding * 2,
    gap: SIZES.padding,
  },
  roleButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  roleButtonTextActive: {
    color: COLORS.white,
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
  signupButton: {
    marginTop: SIZES.padding,
  },
  loginLink: {
    marginTop: SIZES.padding * 2,
    alignItems: 'center',
  },
  loginText: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
  },
  loginTextBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default SignupScreen;

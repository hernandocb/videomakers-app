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
import { validateEmail } from '../../utils/helpers';

const LoginScreen = ({ navigation }) => {
  const { login, googleSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erro', result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await googleSignIn();
    setGoogleLoading(false);

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
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🎥</Text>
          </View>
          <Text style={styles.title}>Bem-vindo!</Text>
          <Text style={styles.subtitle}>Entre para continuar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <CustomButton
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.divider} />
          </View>

          <CustomButton
            title="Entrar com Google"
            onPress={handleGoogleSignIn}
            loading={googleLoading}
            style={styles.googleButton}
            textStyle={styles.googleButtonText}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            style={styles.signupLink}
          >
            <Text style={styles.signupText}>
              Não tem conta? <Text style={styles.signupTextBold}>Cadastre-se</Text>
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
    alignItems: 'center',
    marginTop: SIZES.padding * 3,
    marginBottom: SIZES.padding * 3,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
  },
  iconText: {
    fontSize: 50,
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
  loginButton: {
    marginTop: SIZES.padding,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.padding * 2,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[300],
  },
  dividerText: {
    marginHorizontal: SIZES.padding,
    color: COLORS.gray[600],
    fontSize: SIZES.body,
  },
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  googleButtonText: {
    color: COLORS.black,
  },
  signupLink: {
    marginTop: SIZES.padding * 2,
    alignItems: 'center',
  },
  signupText: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
  },
  signupTextBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default LoginScreen;

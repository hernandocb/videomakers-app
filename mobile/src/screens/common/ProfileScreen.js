import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';
import Icon from 'react-native-vector-icons/Ionicons';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Confirmar',
      'Deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          onPress: () => logout(),
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // CORREÇÃO: Usando getParent() para navegar para a stack pai
    navigation.getParent()?.navigate('EditProfile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Icon name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.nome)}</Text>
        </View>
        <Text style={styles.name}>{user?.nome}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'client' ? '👤 Cliente' : '🎥 Videomaker'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefone</Text>
          <Text style={styles.infoValue}>{user?.telefone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cidade</Text>
          <Text style={styles.infoValue}>
            {user?.cidade || 'Não informado'}, {user?.estado || ''}
          </Text>
        </View>
        {user?.role === 'videomaker' && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rating</Text>
              <Text style={styles.infoValue}>
                ⭐ {user?.rating_medio?.toFixed(1) || '0.0'} ({user?.total_avaliacoes || 0})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Raio de Atuação</Text>
              <Text style={styles.infoValue}>{user?.raio_atuacao_km || 50} km</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <CustomButton 
          title="Editar Perfil" 
          onPress={handleEditProfile}
          icon="create-outline"
        />
        <CustomButton title="Sair" onPress={handleLogout} variant="outline" />
      </View>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  editButton: {
    position: 'absolute',
    top: SIZES.padding * 2,
    right: SIZES.padding * 2,
    zIndex: 1,
    padding: SIZES.base,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  avatarText: {
    fontSize: SIZES.h1,
    fontWeight: '700',
    color: COLORS.white,
  },
  name: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SIZES.base / 2,
  },
  email: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginBottom: SIZES.padding,
  },
  roleBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderRadius: SIZES.radius,
  },
  roleText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.white,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SIZES.padding,
    padding: SIZES.padding * 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    flex: 0.4,
  },
  infoValue: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'right',
    flex: 0.6,
    flexWrap: 'wrap',
  },
  actions: {
    padding: SIZES.padding * 2,
    gap: SIZES.padding,
  },
});

export default ProfileScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - SIZES.padding * 4) / 3;

const PortfolioScreen = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const { data } = await usersAPI.getProfile();
      setPortfolio(data.portfolio_videos || []);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedia = () => {
    const options = {
      mediaType: 'mixed',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      selectionLimit: 0, // Allow multiple selection
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        Alert.alert('Erro', response.errorMessage || 'Erro ao selecionar mídia');
        return;
      }

      const assets = response.assets;
      if (!assets || assets.length === 0) {
        return;
      }

      // Check file sizes (25MB limit per file for MongoDB)
      const maxSize = 25 * 1024 * 1024; // 25MB
      const oversizedFiles = assets.filter(asset => asset.fileSize > maxSize);
      
      if (oversizedFiles.length > 0) {
        Alert.alert(
          'Arquivo muito grande',
          `Alguns arquivos excedem o limite de 25MB. Por favor, selecione arquivos menores.`
        );
        return;
      }

      await uploadMedia(assets);
    });
  };

  const uploadMedia = async (assets) => {
    setUploading(true);

    try {
      for (const asset of assets) {
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `upload_${Date.now()}.jpg`,
        });

        await usersAPI.uploadPortfolio(formData);
      }

      Alert.alert('Sucesso!', `${assets.length} arquivo(s) enviado(s) com sucesso`);
      await loadPortfolio();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Não foi possível fazer upload dos arquivos'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = (itemId) => {
    Alert.alert(
      'Remover do Portfolio',
      'Tem certeza que deseja remover este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement delete endpoint in backend
              // await usersAPI.deletePortfolioItem(itemId);
              setPortfolio(prev => prev.filter(item => item !== itemId));
              Alert.alert('Sucesso', 'Item removido do portfolio');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível remover o item');
            }
          },
        },
      ]
    );
  };

  const renderPortfolioItem = ({ item, index }) => {
    const isVideo = item.includes('.mp4') || item.includes('.mov');

    return (
      <TouchableOpacity
        style={styles.portfolioItem}
        onLongPress={() => handleDeleteMedia(item)}
      >
        {isVideo ? (
          <View style={styles.videoPlaceholder}>
            <Icon name="play-circle" size={40} color={COLORS.white} />
          </View>
        ) : (
          <Image
            source={{ uri: item }}
            style={styles.portfolioImage}
            resizeMode="cover"
          />
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteMedia(item)}
        >
          <Icon name="close-circle" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Meu Portfolio</Text>
        <Text style={styles.subtitle}>
          {portfolio.length} {portfolio.length === 1 ? 'item' : 'itens'}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Icon name="information-circle-outline" size={24} color={COLORS.primary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Dicas para o Portfolio</Text>
          <Text style={styles.infoText}>
            • Adicione seus melhores trabalhos{'\n'}
            • Limite de 25MB por arquivo{'\n'}
            • Formatos: JPG, PNG, MP4, MOV{'\n'}
            • Pressione e segure para remover
          </Text>
        </View>
      </View>

      {portfolio.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="images-outline" size={80} color={COLORS.gray[300]} />
          <Text style={styles.emptyTitle}>Portfolio Vazio</Text>
          <Text style={styles.emptyText}>
            Adicione fotos e vídeos dos seus trabalhos para atrair mais clientes
          </Text>
        </View>
      ) : (
        <FlatList
          data={portfolio}
          renderItem={renderPortfolioItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3}
          contentContainerStyle={styles.portfolioList}
          columnWrapperStyle={styles.portfolioRow}
        />
      )}

      <View style={styles.footer}>
        <CustomButton
          title={uploading ? 'Enviando...' : '+ Adicionar Mídia'}
          onPress={handleSelectMedia}
          loading={uploading}
          disabled={uploading}
        />
      </View>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    margin: SIZES.padding * 2,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoContent: {
    flex: 1,
    marginLeft: SIZES.padding,
  },
  infoTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.base / 2,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.gray[700],
    lineHeight: 18,
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
  portfolioList: {
    padding: SIZES.padding,
  },
  portfolioRow: {
    justifyContent: 'flex-start',
  },
  portfolioItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SIZES.base / 2,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.gray[200],
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.black + '80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  footer: {
    padding: SIZES.padding * 2,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
});

export default PortfolioScreen;

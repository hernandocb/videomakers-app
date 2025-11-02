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
import { ratingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES } from '../../utils/constants';

const RatingScreen = ({ route, navigation }) => {
  const { job, ratedUserId, ratedUserName, ratedUserRole } = route.params;
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const ratingLabels = {
    1: 'Muito Ruim',
    2: 'Ruim',
    3: 'Regular',
    4: 'Bom',
    5: 'Excelente',
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erro', 'Selecione uma avaliação de 1 a 5 estrelas');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Erro', 'Por favor, escreva um comentário sobre a experiência');
      return;
    }

    setLoading(true);

    try {
      await ratingsAPI.create({
        job_id: job.id,
        rated_user_id: ratedUserId,
        rating: rating,
        comment: comment.trim(),
      });

      Alert.alert(
        'Avaliação Enviada!',
        'Obrigado pelo seu feedback',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Rating error:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Não foi possível enviar a avaliação'
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
          <Text style={styles.headerTitle}>Avaliar</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Job Info */}
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{job.titulo}</Text>
          <View style={styles.jobDetail}>
            <Icon name="person-outline" size={18} color={COLORS.gray[600]} />
            <Text style={styles.jobDetailText}>
              Avaliando: {ratedUserName} ({ratedUserRole === 'videomaker' ? 'Videomaker' : 'Cliente'})
            </Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Como foi sua experiência?</Text>
          
          {/* Stars */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Icon
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={48}
                  color={star <= rating ? COLORS.warning : COLORS.gray[300]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.commentCard}>
          <Text style={styles.sectionTitle}>Conte mais sobre sua experiência</Text>
          
          <TextInput
            style={styles.textArea}
            placeholder={
              user.role === 'client'
                ? 'Como foi trabalhar com este videomaker? O trabalho ficou bom? Recomendaria?'
                : 'Como foi trabalhar com este cliente? A comunicação foi boa? Pagamento em dia?'
            }
            multiline
            numberOfLines={6}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
            maxLength={500}
          />
          
          <Text style={styles.charCount}>{comment.length}/500 caracteres</Text>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesCard}>
          <View style={styles.guidelineItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.guidelineText}>Seja honesto e construtivo</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.guidelineText}>Avalie o profissionalismo e qualidade</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.guidelineText}>Evite linguagem ofensiva</Text>
          </View>
        </View>

        <CustomButton
          title="Enviar Avaliação"
          onPress={handleSubmit}
          loading={loading}
          disabled={rating === 0 || !comment.trim()}
          style={styles.submitButton}
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
  },
  jobDetailText: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginLeft: SIZES.base,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
    padding: SIZES.padding * 2,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.padding * 2,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SIZES.padding,
  },
  starButton: {
    padding: SIZES.base,
  },
  ratingLabel: {
    fontSize: SIZES.h3,
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: SIZES.base,
  },
  commentCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
    padding: SIZES.padding * 2,
    borderRadius: SIZES.radius,
  },
  textArea: {
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    fontSize: SIZES.body,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
    marginTop: SIZES.base,
    textAlign: 'right',
  },
  guidelinesCard: {
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: SIZES.padding * 2,
    marginBottom: SIZES.padding * 2,
    padding: SIZES.padding * 1.5,
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  guidelineText: {
    fontSize: SIZES.body,
    color: COLORS.gray[700],
    marginLeft: SIZES.padding,
  },
  submitButton: {
    marginHorizontal: SIZES.padding * 2,
  },
});

export default RatingScreen;

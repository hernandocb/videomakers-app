import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../utils/constants';
import { formatCurrency, formatDateShort, truncateText, calculateDistance } from '../utils/helpers';

const JobCard = ({ job, onPress, showDistance = false, userLocation = null }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return COLORS.success;
      case 'in_progress':
        return COLORS.warning;
      case 'completed':
        return COLORS.gray[400];
      default:
        return COLORS.danger;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  // Calcular distância se userLocation e job location estão disponíveis
  const distance = 
    showDistance &&
    userLocation &&
    job.local?.latitude &&
    job.local?.longitude
      ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          job.local.latitude,
          job.local.longitude
        )
      : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>{truncateText(job.titulo, 40)}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.badgeText}>{getStatusLabel(job.status)}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {job.descricao}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Icon name="location-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>
            {job.local?.cidade}, {job.local?.estado}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="time-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>{job.duracao_horas}h</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="calendar-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>{formatDateShort(job.data_gravacao)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.categoryLabel}>Categoria</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{job.categoria}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Valor Mínimo</Text>
          <Text style={styles.price}>{formatCurrency(job.valor_minimo)}</Text>
        </View>
      </View>

      {distance && (
        <View style={styles.distanceContainer}>
          <Icon name="navigate-outline" size={14} color={COLORS.primary} />
          <Text style={styles.distanceText}>{distance} km de distância</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.base,
  },
  title: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
    marginRight: SIZES.base,
  },
  badge: {
    paddingHorizontal: SIZES.base,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  description: {
    fontSize: SIZES.body,
    color: COLORS.gray[600],
    marginBottom: SIZES.padding,
    lineHeight: 20,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.padding,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.padding,
    marginBottom: SIZES.base / 2,
  },
  detailText: {
    fontSize: SIZES.small,
    color: COLORS.gray[600],
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: SIZES.padding / 2,
  },
  categoryLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SIZES.base,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: SIZES.small,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  price: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.success,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.base,
    paddingTop: SIZES.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  distanceText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default JobCard;

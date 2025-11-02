import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SIZES } from '../utils/constants';
import Icon from 'react-native-vector-icons/Ionicons'; // Importar o Icon

const CustomButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const getButtonStyle = () => {
    if (disabled) return styles.buttonDisabled;
    switch (variant) {
      case 'secondary':
        return styles.buttonSecondary;
      case 'outline':
        return styles.buttonOutline;
      default:
        return styles.buttonPrimary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.textOutline;
      default:
        return styles.textDefault;
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    // CORREÇÃO: Se 'icon' for uma string, renderize como <Icon>, senão, renderize como está
    if (typeof icon === 'string') {
      return <Icon name={icon} size={SIZES.font * 1.2} color={getTextStyle().color} style={styles.icon} />;
    }
    return icon;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.white} />
      ) : (
        <>
          {renderIcon()}
          <Text style={[styles.text, getTextStyle()]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding * 2,
    borderRadius: SIZES.radius,
    minHeight: 50,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.gray[600],
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  text: {
    fontSize: SIZES.font,
    fontWeight: '600',
  },
  textDefault: {
    color: COLORS.white,
  },
  textOutline: {
    color: COLORS.primary,
  },
  icon: {
    marginRight: SIZES.base,
  }
});

export default CustomButton;

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Colors } from '@/constants/theme';

export type CustomModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'destructive' | 'cancel';
  }>;
  onBackdropPress?: () => void;
  showCloseButton?: boolean;
  animationType?: 'fade' | 'slide' | 'none';
};

export function CustomModal({
  visible,
  title,
  message,
  children,
  buttons = [],
  onBackdropPress,
  showCloseButton = false,
  animationType = 'fade',
}: CustomModalProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Reset to 0 first, then animate to 1
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animatedValue]);

  const modalScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const modalOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return [styles.button, styles.destructiveButton];
      case 'cancel':
        return [styles.button, styles.cancelButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return [styles.buttonText, styles.destructiveButtonText];
      case 'cancel':
        return [styles.buttonText, styles.cancelButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onBackdropPress}
    >
      <TouchableWithoutFeedback onPress={onBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }],
                },
              ]}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {showCloseButton && onBackdropPress && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={onBackdropPress}
                    >
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <View style={styles.content}>
                {message && <Text style={styles.message}>{message}</Text>}
                {children}
              </View>

              {/* Buttons */}
              {buttons.length > 0 && (
                <View style={styles.buttonContainer}>
                  {buttons.length === 1 ? (
                    <TouchableOpacity
                      style={getButtonStyle(buttons[0].style)}
                      onPress={buttons[0].onPress}
                    >
                      <Text style={getButtonTextStyle(buttons[0].style)}>
                        {buttons[0].text}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.buttonRow}>
                      {buttons.map((button, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            getButtonStyle(button.style),
                            { flex: 1 },
                            index > 0 && { marginLeft: 10 },
                          ]}
                          onPress={button.onPress}
                        >
                          <Text style={getButtonTextStyle(button.style)}>
                            {button.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.dark.background,
    borderRadius: 15,
    minWidth: 280,
    maxWidth: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    top: 20,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  message: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  defaultButton: {
    backgroundColor: 'rgba(10, 126, 164, 0.9)', // Using app's tint color
  },
  destructiveButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  defaultButtonText: {
    color: 'white',
  },
  destructiveButtonText: {
    color: 'white',
  },
  cancelButtonText: {
    color: '#ccc',
  },
});

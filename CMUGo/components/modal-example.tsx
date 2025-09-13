import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CustomModal } from '@/components/custom-modal';
import { useCustomModal } from '@/hooks/use-custom-modal';
import { Colors } from '@/constants/theme';

export default function ModalExampleScreen() {
  const { isVisible, modalOptions, showModal, hideModal, showAlert } = useCustomModal();

  const showSimpleAlert = () => {
    showAlert('Success!', 'This is a simple alert with just an OK button.');
  };

  const showConfirmAlert = () => {
    showAlert(
      'Confirm Action',
      'Are you sure you want to proceed with this action?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          style: 'destructive',
          onPress: () => console.log('User confirmed action')
        }
      ]
    );
  };

  const showCustomModal = () => {
    showModal({
      title: 'Custom Content',
      showCloseButton: true,
      buttons: [
        {
          text: 'Done',
          onPress: hideModal,
          style: 'default',
        }
      ]
    });
  };

  const showModalWithoutTitle = () => {
    showModal({
      message: 'This modal has no title, just a message and buttons.',
      buttons: [
        { text: 'Cancel', onPress: hideModal, style: 'cancel' },
        { text: 'OK', onPress: hideModal, style: 'default' }
      ]
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Custom Modal Examples</Text>
        
        <TouchableOpacity style={styles.button} onPress={showSimpleAlert}>
          <Text style={styles.buttonText}>Simple Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={showConfirmAlert}>
          <Text style={styles.buttonText}>Confirmation Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={showCustomModal}>
          <Text style={styles.buttonText}>Custom Modal with Close Button</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={showModalWithoutTitle}>
          <Text style={styles.buttonText}>Modal Without Title</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Modal Component */}
      <CustomModal
        visible={isVisible}
        title={modalOptions.title}
        message={modalOptions.message}
        buttons={modalOptions.buttons}
        onBackdropPress={hideModal}
        showCloseButton={modalOptions.showCloseButton}
      >
        {/* Custom content example */}
        {modalOptions.title === 'Custom Content' && (
          <View style={styles.customContent}>
            <Text style={styles.customText}>
              This is custom content inside the modal. You can put any React components here!
            </Text>
            <View style={styles.customBox}>
              <Text style={styles.customBoxText}>Custom Component</Text>
            </View>
          </View>
        )}
      </CustomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: 'rgba(10, 126, 164, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  customContent: {
    alignItems: 'center',
  },
  customText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  customBox: {
    backgroundColor: 'rgba(10, 126, 164, 0.2)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.5)',
  },
  customBoxText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

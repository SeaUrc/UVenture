import { useState, useCallback } from 'react';

export type ModalButton = {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
};

export type ModalOptions = {
  title?: string;
  message?: string;
  buttons?: ModalButton[];
  showCloseButton?: boolean;
};

export function useCustomModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});

  const showModal = useCallback((options: ModalOptions) => {
    setModalOptions(options);
    setIsVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsVisible(false);
    // Clear options after a delay to allow animation to complete
    setTimeout(() => {
      setModalOptions({});
    }, 200);
  }, []);

  // Helper function similar to Alert.alert
  const showAlert = useCallback((
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'destructive' | 'cancel';
    }>
  ) => {
    const modalButtons = buttons?.map(button => ({
      text: button.text,
      onPress: () => {
        hideModal();
        button.onPress?.();
      },
      style: button.style,
    })) || [
      {
        text: 'OK',
        onPress: hideModal,
        style: 'default' as const,
      }
    ];

    showModal({
      title,
      message,
      buttons: modalButtons,
    });
  }, [showModal, hideModal]);

  return {
    isVisible,
    modalOptions,
    showModal,
    hideModal,
    showAlert,
  };
}

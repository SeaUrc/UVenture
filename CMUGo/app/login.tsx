import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const databaseUrl = 'http://unrevetted-larue-undeleterious.ngrok-free.app';

type Team = {
  id: number;
  name: string;
  color: string;
};

export default function LoginScreen() {
  // Basic form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Team selection for signup
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  
  // Profile picture for signup
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  
  const router = useRouter();

  // Load teams when signup is selected
  useEffect(() => {
    if (isSignUp) {
      loadTeams();
    }
  }, [isSignUp]);

  const loadTeams = async () => {
    try {
      const response = await fetch(`${databaseUrl}/api/teams/get_teams`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw teams response:', data);
        
        // The response format is { "data": [array of team objects] }
        if (data.data && Array.isArray(data.data)) {
          console.log('Teams array found:', data.data);
          setTeams(data.data);
        } else {
          console.error('Unexpected response format. Expected { data: [...] }, got:', data);
          setTeams([]);
        }
      } else {
        console.error('Failed to load teams. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const signIn = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${databaseUrl}/api/auth/sign_in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error('Sign in failed');
      }

      const data = await response.json();
      console.log('Sign in response:', data);

      if (data.token && data.id) {
        // Store auth data and navigate to app
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.id.toString());
        await AsyncStorage.setItem('username', username.trim());

        Alert.alert('Welcome Back!', 'Successfully signed in', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    if (!selectedTeam) {
      Alert.alert('Error', 'Please select a team');
      return;
    }

    if (!profileImage) {
      Alert.alert('Error', 'Please upload a profile picture');
      return;
    }

    setIsLoading(true);
    try {
      // Convert image to base64
      const response = await fetch(profileImage);
      const blob = await response.blob();
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Create account with all data
      const createResponse = await fetch(`${databaseUrl}/api/auth/create_account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          team: selectedTeam,
          image: base64Data,
          strength: 10,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(errorText || 'Account creation failed');
      }

      const data = await createResponse.json();
      console.log('Create account response:', data);

      if (data.username != "") {
        // Store auth data and navigate to app
        await AsyncStorage.setItem('username', username.trim());

        Alert.alert('Welcome!', 'Account created successfully!', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Create account error:', error);
      if (error.message.includes('already exists')) {
        Alert.alert('Error', 'Username already exists. Please choose another.');
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const pickImageFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setShowImagePickerModal(false);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setShowImagePickerModal(false);
    }
  };

  const showImageOptions = () => {
    setShowImagePickerModal(true);
  };

  const selectTeam = (team: Team) => {
    setSelectedTeam(team.id);
    setShowTeamModal(false);
  };

  const getSelectedTeamName = () => {
    const team = teams.find(t => t.id === selectedTeam);
    return team ? team.name : 'Choose a team...';
  };

  const getSelectedTeamColor = () => {
    const team = teams.find(t => t.id === selectedTeam);
    return team ? team.color : '#ccc';
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setSelectedTeam(null);
    setProfileImage(null);
    setShowTeamModal(false);
    setShowImagePickerModal(false);
  };

  const renderTeamItem = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={styles.teamModalItem}
      onPress={() => selectTeam(item)}
    >
      <View style={[styles.teamModalDot, { backgroundColor: item.color }]} />
      <ThemedText style={styles.teamModalText}>{item.name}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ThemedText style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </ThemedText>
          
          <ThemedText style={styles.subtitle}>
            {isSignUp ? 'Join CMU Go!' : 'Sign in to your account'}
          </ThemedText>

          <View style={styles.formContainer}>
            {/* Username and Password - Always visible */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Username</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your username"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Team Selection - Only for signup */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Select Team</ThemedText>
                <TouchableOpacity
                  style={styles.teamSelector}
                  onPress={() => setShowTeamModal(true)}
                  disabled={isLoading}
                >
                  <View style={styles.teamSelectorContent}>
                    {selectedTeam && (
                      <View style={[styles.teamSelectorDot, { backgroundColor: getSelectedTeamColor() }]} />
                    )}
                    <ThemedText style={[
                      styles.teamSelectorText,
                      !selectedTeam && styles.placeholderText
                    ]}>
                      {getSelectedTeamName()}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.dropdownArrow}>▼</ThemedText>
                </TouchableOpacity>

                {selectedTeam && (
                  <View style={styles.teamPreview}>
                    {(() => {
                      const team = teams.find(t => t.id === selectedTeam);
                      return team ? (
                        <View style={styles.teamCard}>
                          <View style={[styles.teamDot, { backgroundColor: team.color }]} />
                          <ThemedText style={styles.teamName}>{team.name}</ThemedText>
                        </View>
                      ) : null;
                    })()}
                  </View>
                )}
              </View>
            )}

            {/* Profile Picture - Only for signup */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Profile Picture</ThemedText>
                
                <View style={styles.imageContainer}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <ThemedText style={styles.placeholderIcon}>📷</ThemedText>
                      <ThemedText style={styles.placeholderImageText}>Tap to add photo</ThemedText>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={showImageOptions}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.imageButtonText}>
                    {profileImage ? 'Change Photo' : 'Add Photo'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={isSignUp ? createAccount : signIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.switchContainer}>
              <ThemedText style={styles.switchText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  resetForm();
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.switchLink}>
                  {isSignUp ? 'Sign In' : 'Create Account'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Team Selection Modal */}
      <Modal
        visible={showTeamModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Team</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTeamModal(false)}
              >
                <ThemedText style={styles.modalCloseText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={teams}
              renderItem={renderTeamItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.teamList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePickerModalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Photo</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImagePickerModal(false)}
              >
                <ThemedText style={styles.modalCloseText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageOptionsContainer}>
              <TouchableOpacity
                style={styles.imageOption}
                onPress={takePhoto}
              >
                <ThemedText style={styles.imageOptionIcon}>📸</ThemedText>
                <ThemedText style={styles.imageOptionText}>Take Photo</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageOption}
                onPress={pickImageFromLibrary}
              >
                <ThemedText style={styles.imageOptionIcon}>🖼️</ThemedText>
                <ThemedText style={styles.imageOptionText}>Choose from Library</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  teamSelector: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  teamSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamSelectorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  teamSelectorText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  teamPreview: {
    marginTop: 15,
    alignItems: 'center',
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  teamDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  placeholderImageText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  imageButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
  },
  imageButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    marginRight: 5,
  },
  switchLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  teamList: {
    maxHeight: 300,
  },
  teamModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  teamModalDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
  },
  teamModalText: {
    fontSize: 16,
    color: '#000',
  },
  // Image picker modal styles
  imagePickerModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
  },
  imageOptionsContainer: {
    gap: 15,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  imageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});
import React, { useState } from 'react';
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
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const databaseUrl = 'https://unrevetted-larue-undeleterious.ngrok-free.app';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<{token: string, id: number} | null>(null);
  const router = useRouter();

  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Reduce quality to keep file size manageable
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (token: string, userId: number, imageUri: string) => {
    try {
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            // Remove the data:image/jpeg;base64, prefix
            const base64Image = base64Data.split(',')[1];

            const uploadResponse = await fetch(`${databaseUrl}/api/profile/upload_image`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                image: base64Image,
              }),
            });

            if (uploadResponse.ok) {
              resolve(true);
            } else {
              throw new Error('Failed to upload image');
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const checkUserHasProfilePicture = async (token: string, userId: number) => {
    try {
      const response = await fetch(`${databaseUrl}/api/profile/get_profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
        }),
      });

      if (response.ok) {
        const profileData = await response.json();
        return profileData.image && profileData.image.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error checking profile picture:', error);
      return false;
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!pendingUserData || !profileImage) return;

    setIsLoading(true);
    try {
      await uploadProfilePicture(pendingUserData.token, pendingUserData.id, profileImage);
      
      // Store authentication data
      await AsyncStorage.setItem('userToken', pendingUserData.token);
      await AsyncStorage.setItem('userId', pendingUserData.id.toString());
      await AsyncStorage.setItem('username', username.trim());

      Alert.alert(
        'Welcome!',
        'Profile picture uploaded successfully!',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture. You can add one later in your profile.');
      
      // Still proceed to app even if image upload fails
      await AsyncStorage.setItem('userToken', pendingUserData.token);
      await AsyncStorage.setItem('userId', pendingUserData.id.toString());
      await AsyncStorage.setItem('username', username.trim());
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const skipProfilePicture = async () => {
    if (!pendingUserData) return;

    // Store authentication data without profile picture
    await AsyncStorage.setItem('userToken', pendingUserData.token);
    await AsyncStorage.setItem('userId', pendingUserData.id.toString());
    await AsyncStorage.setItem('username', username.trim());

    Alert.alert(
      'Welcome!',
      'You can add a profile picture later in your profile settings.',
      [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  const createAccount = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${databaseUrl}/api/auth/create_account`, {
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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.token && data.id) {
        // After successful account creation, prompt for profile picture
        setPendingUserData({ token: data.token, id: data.id });
        setShowProfileUpload(true);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Create account error:', error);
      Alert.alert(
        'Error', 
        'Failed to create account. Username might already exist or there was a server error.'
      );
    } finally {
      setIsLoading(false);
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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.token && data.id) {
        // Check if user has a profile picture
        const hasProfilePicture = await checkUserHasProfilePicture(data.token, data.id);
        
        if (!hasProfilePicture) {
          // Prompt to upload profile picture
          setPendingUserData({ token: data.token, id: data.id });
          setShowProfileUpload(true);
        } else {
          // Store authentication data and proceed
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.id.toString());
          await AsyncStorage.setItem('username', username.trim());

          Alert.alert(
            'Welcome Back!',
            `Successfully signed in as ${username}`,
            [
              {
                text: 'Continue',
                onPress: () => router.replace('/(tabs)'),
              },
            ]
          );
        }
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert(
        'Error', 
        'Failed to sign in. Please check your username and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (isSignUp) {
      createAccount();
    } else {
      signIn();
    }
  };

  if (showProfileUpload) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.profileUploadContainer}>
          <ThemedText style={styles.title}>
            {isSignUp ? 'Welcome to CMU Go!' : 'Welcome Back!'}
          </ThemedText>
          
          <ThemedText style={styles.subtitle}>
            Add a profile picture to personalize your account
          </ThemedText>

          <View style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <ThemedText style={styles.placeholderText}>📷</ThemedText>
                <ThemedText style={styles.placeholderSubtext}>Tap to add photo</ThemedText>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImage}
            disabled={isLoading}
          >
            <ThemedText style={styles.imagePickerButtonText}>
              {profileImage ? 'Change Photo' : 'Choose Photo'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.profileButtonsContainer}>
            {profileImage && (
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleProfilePictureUpload}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    Upload & Continue
                  </ThemedText>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.skipButton}
              onPress={skipProfilePicture}
              disabled={isLoading}
            >
              <ThemedText style={styles.skipButtonText}>
                Skip for Now
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <ThemedText style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </ThemedText>
          
          <ThemedText style={styles.subtitle}>
            {isSignUp ? 'Join CMU Go!' : 'Sign in to your account'}
          </ThemedText>

          <View style={styles.formContainer}>
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

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.submitButtonText}>
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
                  setUsername('');
                  setPassword('');
                  setProfileImage(null);
                  setShowProfileUpload(false);
                  setPendingUserData(null);
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
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  profileUploadContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
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
  submitButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 40,
    marginBottom: 5,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#666',
  },
  imagePickerButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 30,
    alignSelf: 'center',
  },
  imagePickerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileButtonsContainer: {
    width: '100%',
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
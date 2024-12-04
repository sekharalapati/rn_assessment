import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import Slider from '@react-native-community/slider';
export default function HomeScreen() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLibrary, setAudioLibrary] = useState([]);
  const [showRecordingScreen, setShowRecordingScreen] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [previewURI, setPreviewURI] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]);
  const audioDir = `${FileSystem.documentDirectory}audio/`;
  const [animationInterval, setAnimationInterval] = useState(null);
  const [currentAudioName, setCurrentAudioName] = useState('Unknown');
  const [currentDuration, setCurrentDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playAudioScreen, setPlayAudioScreen] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null); // Track currently playing audio by URI

  useEffect(() => {
    const fetchAudioFiles = async () => {
      if (Platform.OS !== 'web') {
        try {
          const dirInfo = await FileSystem.getInfoAsync(audioDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
          }

          const files = await FileSystem.readDirectoryAsync(audioDir);
          const audioFiles = files.map((file) => ({
            id: file,
            uri: `${audioDir}${file}`,
          }));
          setAudioLibrary(audioFiles);
        } catch (error) {
          console.error('Failed to fetch audio files:', error);
        }
      }
    };

    fetchAudioFiles();
  }, []);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      setTimerInterval(interval);

      return () => clearInterval(interval); // Cleanup interval when not recording
    }
  }, [isRecording]);

  useEffect(() => {
    if (!previewURI) {
      setIsPreviewing(false);
    }
  }, [previewURI]);

  useEffect(() => {
    // Initialize 8 animated bars for the waveform (starting from a neutral height)
    const initialLevels = Array.from({ length: 12 }, () => new Animated.Value(10));
    setAudioLevels(initialLevels);
  }, []);


  const startRecording = async () => {
    try {
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Audio recording permissions are required.');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);
      animateWave(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Recording URI is undefined');
      }

      setPreviewURI(uri);
      setIsPreviewing(true);
      setRecording(null);
      setIsRecording(false);
      setRecordingTime(0);
      clearInterval(timerInterval);
      if (animationInterval) {
        clearInterval(animationInterval); // Clear the interval reference
        setAnimationInterval(null); // Reset the interval state
      }

      // Reset the bars to their neutral state (small height)
      resetWaveform();
    } catch (err) {
      console.error('Failed to stop and preview recording', err);
      Alert.alert('Error', 'Failed to stop and preview recording. Please try again.');
    }
  };
  const animateWave = async (recording: Audio.Recording) => {
    if (!recording) return;

    const interval = setInterval(async () => {
      try {
        // Simulate sound levels (replace with actual microphone amplitude if available)
        const amplitude = Math.random() * 100;
        const newLevels = audioLevels.map((level) => {
          return Animated.timing(level, {
            toValue: Math.random() * 80 + 20, // Randomize heights for animation effect
            duration: 100,
            useNativeDriver: false,
          });
        });

        Animated.stagger(50, newLevels).start(); // Apply staggered animation to each bar
      } catch (err) {
        console.error('Error animating sound wave:', err);
        clearInterval(interval); // Stop animation if an error occurs
      }
    }, 200); // Update the wave every 200ms

    setAnimationInterval(interval); // Store the interval reference
  };

  // Reset the waveform to its neutral state (when the recording stops)
  const resetWaveform = () => {
    audioLevels.forEach((level) => {
      Animated.timing(level, {
        toValue: 10, // Set the bars back to a neutral state
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };
  const saveRecording = async () => {
    try {
      const fileName = `audio_${Date.now()}.m4a`;
      const newPath = `${audioDir}${fileName}`;

      await FileSystem.moveAsync({
        from: previewURI,
        to: newPath,
      });

      // Update the audio library with the new file
      setAudioLibrary((prevLibrary) => [
        ...prevLibrary,
        { id: fileName, uri: newPath },
      ]);

      // Reset preview state and navigate to the library
      setPreviewURI(null);
      setIsPreviewing(false);
      setShowRecordingScreen(false);
    } catch (err) {
      console.error('Failed to save recording', err);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };



  let currentSound: Audio.Sound | null = null; // Store the current Audio.Sound instance

  const previewAudio = async (uri: any, name: any) => {
    if (!uri) {
      Alert.alert('Error', 'No audio URI available to play.');
      return;
    }

    try {
      if (currentSound && isPlaying) {
        // Pause the audio if already playing
        await currentSound.pauseAsync();
        setIsPlaying(false);
      } else if (currentSound && !isPlaying) {
        // Resume playback if paused
        await currentSound.playAsync();
        setIsPlaying(true);
      } else {
        // Load and play a new sound
        if (currentSound) {
          await currentSound.unloadAsync(); // Unload previous sound
          currentSound = null;
        }

        const sound = new Audio.Sound();

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setCurrentDuration(status.positionMillis / 1000); // Current time in seconds
            setTotalDuration(status.durationMillis / 1000); // Total time in seconds

            // Update progress bar
            if (status.durationMillis) {
              const progress = (status.positionMillis / status.durationMillis) * 100;
              setProgressBarWidth(progress);
            }

            if (status.didJustFinish) {
              sound.unloadAsync(); // Stop playback when finished
              currentSound = null;
              setIsPlaying(false);
            }
          }
        });

        await sound.loadAsync({ uri });
        await sound.playAsync();

        currentSound = sound;
        setCurrentAudioName(name);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Unable to play the audio file.');
    }
  };


  const cancelPreview = async () => {
    try {
      // Stop and unload the current sound if it's playing
      if (currentSound) {
        await currentSound.stopAsync();  // Stop audio playback
        await currentSound.unloadAsync(); // Unload the audio file
        currentSound = null; // Clear the reference to the current sound
      }

      // Reset preview-related states
      setPreviewURI(null);
      setIsPreviewing(false);
      setCurrentAudioName('Unknown'); // Reset current audio name
      setCurrentDuration(0); // Reset progress duration
      setTotalDuration(0); // Reset total duration
      setProgressBarWidth(0); // Reset progress bar
      setIsPlaying(false); // Reset play state
    } catch (error) {
      console.error('Error during cancel preview:', error);
      Alert.alert('Error', 'Failed to cancel preview. Please try again.');
    }
  };




  const renderAudioItem = ({ item }) => (
    <View style={styles.audioItem}>
      <Text style={styles.audioText}>{item.id}</Text>
      <Ionicons
        name={isPlaying ? "pause-circle" : "play-circle"} // Change icon based on isPlaying state
        size={64}
        color="skyblue"
        onPress={() => setPlayAudioScreen(true)}
      />
    </View>
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSliderChange = async (value: number, sound: { setPositionAsync: (arg0: number) => any; }) => {
    if (sound) {
      const newPosition = value * duration;
      await sound.setPositionAsync(newPosition * 1000);
    }
  };


  const playPauseAudio = async (uri: any, name: any) => {
    try {
      if (playingAudio && playingAudio.uri === uri) {
        // If the same audio is clicked, toggle play/pause
        if (playingAudio.isPlaying) {
          await playingAudio.sound.pauseAsync();
          setPlayingAudio({ ...playingAudio, isPlaying: false });
        } else {
          await playingAudio.sound.playAsync();
          setPlayingAudio({ ...playingAudio, isPlaying: true });
        }
      } else {
        // Load and play a new audio
        if (playingAudio) {
          await playingAudio.sound.unloadAsync(); // Stop and unload the previous audio
        }
  
        const sound = new Audio.Sound();
        await sound.loadAsync({ uri });
        await sound.playAsync();
  
        // Set up the playback status update listener
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setPlayingAudio(null); // Reset playing audio
            setAudioLibrary((prev) =>
              prev.map((item) => ({ ...item, isPlaying: false }))
            );
          }
        });
  
        setPlayingAudio({
          uri,
          sound,
          isPlaying: true,
        });
      }
  
      // Update the UI to reflect the current playback state
      setAudioLibrary((prev) =>
        prev.map((item) => ({
          ...item,
          isPlaying: item.uri === uri ? !item.isPlaying : false,
        }))
      );
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert("Error", "Unable to play/pause the audio file.");
    }
  };
  



// currentSound.setOnPlaybackStatusUpdate((status) => {
//   if (status.isLoaded) {
//     setCurrentPosition(status.positionMillis / 1000); // Position in seconds
//     setDuration(status.durationMillis / 1000); // Duration in seconds
//     if (status.didJustFinish) {
//       setIsPlaying(false);
//     }
//   } else {
//     console.error("Playback status not loaded.");
//   }
// });


  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.mainContainer}>
        {isPreviewing ? (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewText}>Audio</Text>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelPreview}>
                <MaterialIcons name="cancel" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <View>
              <Image
                source={require('@/assets/images/audio.png')}
                style={styles.audioImage}
              />
            </View>
            <Text style={styles.audioTItleText}>Audio Generated!</Text>
            <Text style={styles.currentAudioName}>{currentAudioName}</Text>

            {/* Progress Bar */}
            {/* Progress Bar */}
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarContainer}>
                {/* Progress Bar */}
                <View style={[styles.progressBar, { width: `${progressBarWidth}%` }]}>
                  {/* Small Circle */}
                  <View style={styles.progressHandle} />
                </View>
              </View>
              {/* Duration Labels */}
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{formatTime(currentDuration)}</Text>
                <Text style={styles.durationText}>{formatTime(totalDuration)}</Text>
              </View>
            </View>


            {/* Play/Pause Button */}
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"} // Change icon based on isPlaying state
              size={64}
              color="skyblue"
              onPress={() => previewAudio(previewURI, currentAudioName)}
            />

            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={saveRecording}>
                <Text style={styles.saveText}>Save audio</Text>
              </TouchableOpacity>
            </View>
          </View>

        ) : showRecordingScreen ? (
          <View style={styles.micContainer}>
            <View style={styles.headerContainer}>
              <TouchableOpacity
                onPress={() => {
                  setShowRecordingScreen(false);
                  setIsRecording(false);
                  setRecordingTime(0);
                  clearInterval(timerInterval);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={32} color="black" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Your Library</Text>
            </View>

            <View style={styles.centerContent}>
              {isRecording ? (
                <><View style={styles.waveContainer}>
                  {audioLevels.map((level, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.bar,
                        { height: level, backgroundColor: `lightgray` },
                      ]}
                    />
                  ))}
                </View>
                  <Text style={styles.timer}>
                    {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{' '}
                    {String(recordingTime % 60).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity style={styles.doneButton} onPress={stopRecording}>
                    <Text style={styles.doneText}>Done</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={startRecording}>
                  <View style={styles.micButton}>
                    <Ionicons name="mic-circle-sharp" size={74} color="#6ab144" />
                    <Text style={styles.micText}>Click on the button to start recording</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : playAudioScreen ? (
          <>
            <View>
            <View style={styles.headerContainer}>
              <TouchableOpacity
                onPress={() => {
                  setPlayAudioScreen(false);
                  setIsRecording(false);
                  setRecordingTime(0);
                  clearInterval(timerInterval);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={32} color="black" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Your Library</Text>
            </View>
            </View>
            <View style={styles.container}>
              <View style={styles.imageContainer}>
                <Image
                  source={require('@/assets/images/audio.png')} // Replace with your audio icon
                  style={styles.audioImage} />
              </View>
              <Text style={styles.audioTItleText}>My Audio</Text>
              <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarContainer}>
                {/* Progress Bar */}
                <View style={[styles.progressBar, { width: `${progressBarWidth}%` }]}>
                  {/* Small Circle */}
                  <View style={styles.progressHandle} />
                </View>
              </View>
              {/* Duration Labels */}
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{formatTime(currentDuration)}</Text>
                <Text style={styles.durationText}>{formatTime(totalDuration)}</Text>
              </View>
            </View>
              <TouchableOpacity style={styles.playPauseButton} onPress={(item) => playPauseAudio(item.uri, item.id)}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={40}
                  color="#fff" />
              </TouchableOpacity>
            </View></>) : (
          <View style={styles.homeContainer}>
            <Text style={styles.text}>Your Library</Text>
            <View style={styles.Container}>
              <Text style={styles.audioTitleText}>Audio Library</Text>
              <Ionicons
                name="add-circle"
                size={64}
                color="skyblue"
                onPress={() => setShowRecordingScreen(true)}
              />
            </View>
            <FlatList
              data={audioLibrary}
              renderItem={renderAudioItem}
              keyExtractor={(item) => item.id}
              style={styles.audioLibrary}
              ListEmptyComponent={<Text style={styles.emptyLibrary}>No audio files yet</Text>}
            />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  waveContainer: {
    width: '60%',
    height: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  homeContainer: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 15,
    fontWeight: 'semibold',
    marginBottom: 10,
    textAlign: 'center',
  },
  Container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  audioText: {
    fontSize: 19,
    fontWeight: '400',
  },
  audioTitleText: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  micText: {
    fontSize: 18,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  micButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'gray',
    marginBottom: 20,
  },
  doneButton: {
    backgroundColor: 'navy',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  doneText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  audioLibrary: {
    marginTop: 20,
  },
  audioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: 'lightgray',
    borderRadius: 5,
  },
  emptyLibrary: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 20,
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row', // Align items horizontally
    justifyContent: 'space-between', // Push items to edges
    alignItems: 'center', // Align items vertically in the center
    width: '100%', // Full width of the parent container
    paddingHorizontal: 16, // Add some horizontal padding
    marginBottom: 16, // Space below the header
  },
  previewText: {
    fontSize: 18,
    fontWeight: '400',
  },
  previewButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#0447a8',
    paddingVertical: 15,
    paddingHorizontal: 120,
    borderRadius: 10,
  },
  saveText: {
    color: 'white',
    fontSize: 19,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
  },
  audioImage: {
    height: 278,
    width: 290,
  },
  audioTItleText: {
    fontSize: 35, // Customize font size as needed
    fontWeight: '400', // Make the text bold (optional)
    textAlign: 'center',
    marginBottom: 15,
  },
  currentAudioName: {
    fontSize: 18, // Customize font size as needed
    fontWeight: '200', // Make the text bold (optional)
    textAlign: 'center',
    marginBottom: 25,
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'gray',
  },
  progressBarContainer: {
    width: '100%',
    height: 5,
    backgroundColor: '#e0e0e0', // Light background color
    marginVertical: 20,
    borderRadius: 5, // Rounded edges for the bar
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'skyblue', // Green or desired progress color
    borderRadius: 5, // Rounded edges for the progress bar
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Push text to opposite edges
    marginTop: 5, // Space between the bar and duration text
  },
  progressBarWrapper: {
    width: '100%',
    marginVertical: 10,
  },
  progressHandle: {
    width: 16, // Diameter of the circle
    height: 16,
    borderRadius: 8, // Makes it a circle
    backgroundColor: 'skyblue', // Same color as the progress bar
    position: 'absolute',
    top: -5.5, // Align vertically with the bar
    right: -8, // Position the circle at the right edge of the bar
  },
  container: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop:60,
  },
  imageContainer: {
    marginBottom: 20,
  },
  slider: {
    width: '90%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 10,
  },
  time: {
    fontSize: 14,
    color: '#555',
  },
  playPauseButton: {
    marginTop: 20,
    backgroundColor: 'skyblue',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


function setCurrentUri(uri: any) {
  throw new Error('Function not implemented.');
}


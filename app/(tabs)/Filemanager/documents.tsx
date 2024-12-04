import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function HomeScreen() {

  const [audioLibrary, setAudioLibrary] = useState([]);

  const audioDir = `${FileSystem.documentDirectory}audio/`;


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
            isPlaying: false,  // Add a new property to track play state of each file
          }));
          setAudioLibrary(audioFiles);
        } catch (error) {
          console.error('Failed to fetch audio files:', error);
        }
      }
    };

    fetchAudioFiles();
  }, []);

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
        const sound = new Audio.Sound();
        await sound.loadAsync({ uri });
        await sound.playAsync();

        setPlayingAudio({
          uri: uri,
          sound: sound,
          isPlaying: true,
        });
      }

      setAudioLibrary((prev) =>
        prev.map((item) => ({
          ...item,
          isPlaying: item.uri === uri ? !item.isPlaying : false,
        }))
      );
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Unable to play or pause the audio file.');
    }
  };

  const cancelPreview = async () => {
    if (playingAudio) {
      await playingAudio.sound.unloadAsync();
      setPlayingAudio(null);
    }
    setPreviewURI(null);
    setIsPreviewing(false);
  };

  const deleteRecording = async (uri: string, id: any) => {
    try {
      await FileSystem.deleteAsync(uri);
      setAudioLibrary((prev) => prev.filter((audio) => audio.id !== id));
      Alert.alert('Deleted', 'Recording has been deleted');
    } catch (error) {
      console.error('Failed to delete audio file', error);
      Alert.alert('Error', 'Failed to delete audio file');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <FlatList
            data={audioLibrary}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.audioItem}>
                <Text style={styles.audioText}>{item.id}</Text>
                <TouchableOpacity onPress={() => playPauseAudio(item.uri, item.id)}>
                  <Ionicons
                    name={item.isPlaying ? 'pause' : 'play'}
                    size={30}
                    color="black"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteRecording(item.uri, item.id)}
                >
                  <MaterialIcons name="delete" size={24} color="black" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  audioText: {
    fontSize: 16,
    flex: 1,
  },
});
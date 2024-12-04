import { Image, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { router } from 'expo-router';

export default function HomeScreen() {
  const handleArrowPress = () => {
    // Handle the action when the arrow is pressed
    router.push('/Filemanager')
    // You can navigate to another screen or trigger some other action here.
  };

  return (
    <View style={styles.mainContainer}> 
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.reactLogo} // Apply the styles correctly
      />
      <Text style={styles.text}>Welcome to EKSAQ</Text> 
      
      {/* Wrap the arrow icon with TouchableOpacity to make it clickable */}
      <TouchableOpacity onPress={handleArrowPress}>
        <AntDesign name="arrowright" style={styles.arrow} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, // Ensures the container takes up the full screen
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: 20, // Add some padding around the content
  },
  reactLogo: {
    height: 278,
    width: 290,
    marginBottom: 20, // Add some spacing between the image and the text
  },
  text: {
    fontSize: 25, // Customize font size as needed
    fontWeight: 'semibold', // Make the text bold (optional)
    textAlign: 'center', // Ensure the text is centered
  },
  arrow: {
    fontSize: 25, // Customize font size as needed
    fontWeight: 'semibold', // Make the text bold (optional)
    textAlign: 'center',
    padding: 15,
  },
});

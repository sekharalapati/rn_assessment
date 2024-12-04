import { Tabs } from 'expo-router';
import React from 'react';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'skyblue', // Set the active tab color to skyblue
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="musical-note" size={35} color={focused ? 'skyblue' : 'gray'} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="arrow-up-from-bracket" size={30} color={focused ? 'skyblue' : 'gray'} />
          ),
        }}
      />
    </Tabs>
  );
}

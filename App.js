// App.js
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';

import HomeScreen from './screens/HomeScreen';
import BrowseScreen from './screens/BrowseScreen';
import MyListScreen from './screens/MyListScreen';
import AccountScreen from './screens/AccountScreen';
import AnimeDetailsScreen from './screens/AnimeDetailsScreen';
import SearchScreen from './screens/SearchScreen';
import SplashScreen from './screens/SplashScreen';
import Player from './screens/Player'; // 👈 importe ton Player


import colors from './theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ showTabs }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          display: showTabs ? 'flex' : 'none', // cache les tabs pendant le splash
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: colors.fontRegular,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home: 'home',
            Browse: 'grid',
            'My List': 'bookmark',
            Account: 'person',
          };
          return (
            <Ionicons
              name={icons[route.name]}
              size={focused ? size + 4 : size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="My List" component={MyListScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });

  const [isLoading, setIsLoading] = useState(true);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      {/* HomeScreen est toujours monté en arrière-plan */}
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="MainTabs">
            {() => <MainTabs showTabs={!isLoading} />}
          </Stack.Screen>
          <Stack.Screen name="AnimeDetails" component={AnimeDetailsScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Player" component={Player} /> 
        </Stack.Navigator>
      </NavigationContainer>

      {/* Splash par-dessus le reste tant qu'on charge */}
      {isLoading && (
        <View style={StyleSheet.absoluteFill}>
          <SplashScreen onAnimationComplete={() => setIsLoading(false)} />
        </View>
      )}
    </View>
  );
}

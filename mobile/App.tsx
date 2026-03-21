import 'react-native-gesture-handler';
import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/types';
import ListScreen from './src/screens/ListScreen';
import CreateScreen from './src/screens/CreateScreen';
import DetailScreen from './src/screens/DetailScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#1e293b',
          headerTitleStyle: { fontWeight: '700' },
          cardStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Stack.Screen name="List" component={ListScreen} options={{ title: 'Heyama Objects' }} />
        <Stack.Screen name="Create" component={CreateScreen} options={{ title: 'Nouvel Objet' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Détail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { THEME } from '../theme/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import BooksCatalogScreen from '../screens/BooksCatalogScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import LoansScreen from '../screens/LoansScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CatalogStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: THEME.colors.background },
        headerTintColor: THEME.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontFamily: THEME.typography.fontFamilyTitle,
          fontSize: 17
        }
      }}
    >
      <Stack.Screen
        name="BooksCatalog"
        component={BooksCatalogScreen}
        options={{ title: 'Archivo de Libros' }}
      />
      <Stack.Screen
        name="BookDetail"
        component={BookDetailScreen}
        options={{ title: 'Ficha del Volumen' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'CatalogTab',
        headerStyle: { backgroundColor: THEME.colors.background },
        headerTintColor: THEME.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontFamily: THEME.typography.fontFamilyTitle,
          fontSize: 17
        },
        tabBarActiveTintColor: THEME.colors.accent,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.colors.background,
          borderTopWidth: 1,
          borderTopColor: '#1A2E4B',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'CatalogTab') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'LoansTab') {
            iconName = focused ? 'moon' : 'moon-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{ tabBarLabel: 'Catálogo' }}
      />
      <Tab.Screen
        name="LoansTab"
        component={LoansScreen}
        options={{
          tabBarLabel: 'Préstamos',
          title: 'Préstamos & Retornos'
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Expediente',
          title: 'Expediente & Sanciones'
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              headerShown: true,
              title: 'Inscripción de Lector',
              headerStyle: { backgroundColor: THEME.colors.background },
              headerTintColor: THEME.colors.textPrimary
            }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

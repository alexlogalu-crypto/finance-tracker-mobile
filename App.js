import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { storage } from './utils/storage';
import { BudgetAlertProvider, useBudgetAlert } from './context/BudgetAlertContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import BudgetScreen from './screens/BudgetScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';
import GoalsScreen from './screens/GoalsScreen';
import AdvisorScreen from './screens/AdvisorScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: '🏠',
  Transactions: '📋',
  Advisor: '💬',
  Budget: '📊',
  Goals: '🎯',
};

function MainTabs() {
  const { alertCount } = useBudgetAlert();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, color: focused ? '#00E5FF' : '#4b5563' }}>
            {TAB_ICONS[route.name] ?? '●'}
          </Text>
        ),
        tabBarActiveTintColor: '#00E5FF',
        tabBarInactiveTintColor: '#4b5563',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#3b494c',
          backgroundColor: '#121318',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Advisor" component={AdvisorScreen} />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ tabBarBadge: alertCount > 0 ? alertCount : undefined }}
      />
      <Tab.Screen name="Goals" component={GoalsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      const onboarded = await storage.getItem('onboarding_complete');
      console.log('onboarded:', onboarded);
      if (onboarded !== 'true') {
        setInitialRoute('Onboarding');
        return;
      }
      const token = await storage.getItem('access_token');
      console.log('token on startup:', token ? 'present' : 'MISSING');
      setInitialRoute(token ? 'Main' : 'Login');
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121318', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <BudgetAlertProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="AddTransaction"
            component={AddTransactionScreen}
            options={{
              headerShown: true,
              title: 'Add Transaction',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#121318' },
              headerTintColor: '#00E5FF',
              headerTitleStyle: { color: '#e3e1e9', fontWeight: '600' },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="TransactionDetail"
            component={TransactionDetailScreen}
            options={{
              headerShown: true,
              title: 'Transaction',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: '#121318' },
              headerTintColor: '#00E5FF',
              headerTitleStyle: { color: '#e3e1e9', fontWeight: '600' },
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </BudgetAlertProvider>
  );
}

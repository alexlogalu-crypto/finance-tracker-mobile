import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import BudgetScreen from './screens/BudgetScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Dashboard: '◈', Transactions: '≡', Budget: '◉' };
  return (
    <Text style={{ fontSize: 20, color: focused ? '#4f6ef7' : '#a0aec0' }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#4f6ef7',
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#2a2a4a',
          backgroundColor: '#16213e',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{
            headerShown: true,
            title: 'Add Transaction',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#16213e' },
            headerTintColor: '#f0f4f8',
            headerTitleStyle: { color: '#f0f4f8' },
          }}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailScreen}
          options={{
            headerShown: true,
            title: 'Transaction',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#16213e' },
            headerTintColor: '#f0f4f8',
            headerTitleStyle: { color: '#f0f4f8' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

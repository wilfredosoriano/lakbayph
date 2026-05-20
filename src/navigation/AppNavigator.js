import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform, View, Text, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import WelcomeScreen from '../screens/WelcomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DestinationsScreen from '../screens/DestinationsScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import TripsListScreen from '../screens/TripsListScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import BudgetScreen from '../screens/BudgetScreen';
import MoreScreen from '../screens/MoreScreen';
import TransportScreen from '../screens/TransportScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen'; // file rename not needed, just route name
import PremiumScreen from '../screens/PremiumScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SearchScreen from '../screens/SearchScreen';
import { getSetting } from '../database/db';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const TABS = [
  { name: 'Home',   label: 'Home',   icon: 'home',                 iconOff: 'home-outline' },
  { name: 'Discover', label: 'Discover', icon: 'sparkles',         iconOff: 'sparkles-outline' },
  { name: 'Trips',  label: 'Trips',  icon: 'briefcase',            iconOff: 'briefcase-outline' },
  { name: 'Budget', label: 'Budget', icon: 'wallet',               iconOff: 'wallet-outline' },
  { name: 'More',   label: 'More',   icon: 'ellipsis-horizontal',  iconOff: 'ellipsis-horizontal-outline' },
];

function CustomTabBar({ state, descriptors, navigation }) {
  const TAB_H = Platform.OS === 'ios' ? 80 : 64;
  const PB    = Platform.OS === 'ios' ? 24 : 8;

  return (
    <View style={[styles.tabBar, { height: TAB_H, paddingBottom: PB }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TABS.find(t => t.name === route.name);
        const iconName = focused ? tab.icon : tab.iconOff;

        return (
          <TouchableWithoutFeedback
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
          >
            <View style={styles.tabItem}>
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? Colors.primary : '#AEAEB2'}
              />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"   component={DashboardScreen} />
      <Tab.Screen name="Discover" component={DestinationsScreen} />
      <Tab.Screen name="Trips"  component={TripsListScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="More"   component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [initialRouteName, setInitialRouteName] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function resolveInitialRoute() {
      const hasSeenWelcome = await getSetting('has_seen_welcome', 'false');
      if (!mounted) return;
      setInitialRouteName(hasSeenWelcome === 'true' ? 'Main' : 'Welcome');
    }

    resolveInitialRoute();

    return () => {
      mounted = false;
    };
  }, []);

  if (!initialRouteName) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.white }}>
        <View style={{ flex: 1, backgroundColor: Colors.white }} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: Colors.white },
          }}
        >
          <Stack.Screen name="Welcome"     component={WelcomeScreen} />
          <Stack.Screen name="Main"        component={MainTabs} />
          <Stack.Screen name="TripDetails"  component={TripDetailsScreen} />
          <Stack.Screen name="CreateTrip"  component={CreateTripScreen} />
          <Stack.Screen name="Transport"   component={TransportScreen} />
          <Stack.Screen name="Settings"    component={SettingsScreen} />
          <Stack.Screen name="TravelBuddy" component={AIAssistantScreen} />
          <Stack.Screen name="Premium"        component={PremiumScreen} />
          <Stack.Screen name="Terms"         component={TermsScreen} />
          <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen} />
          <Stack.Screen name="Search"        component={SearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: '#AEAEB2',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
});

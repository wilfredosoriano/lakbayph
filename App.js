import 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { UserProvider } from './src/context/UserContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { fetchAndCachePlaces } from './src/utils/placesSync';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    'Cause-Regular':   require('./assets/fonts/Cause-Regular.ttf'),
    'Cause-Medium':    require('./assets/fonts/Cause-Medium.ttf'),
    'Cause-SemiBold':  require('./assets/fonts/Cause-SemiBold.ttf'),
    'Cause-Bold':      require('./assets/fonts/Cause-Bold.ttf'),
    'Cause-ExtraBold': require('./assets/fonts/Cause-ExtraBold.ttf'),
    'Cause-Black':     require('./assets/fonts/Cause-Black.ttf'),
  });

  // Silently sync new places from GitHub Gist after fonts load
  useEffect(() => {
    if (!fontsLoaded) return;
    fetchAndCachePlaces().catch(() => {}); // fire-and-forget, never blocks UI
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (!fontsLoaded) return;
    await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <PremiumProvider>
        <UserProvider>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </UserProvider>
      </PremiumProvider>
    </View>
  );
}

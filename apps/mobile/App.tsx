import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon, {IconName} from './src/components/Icon';
import {StoreProvider, useStore} from './src/store';
import {ToastProvider} from './src/components/fx';
import {colors} from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import ShopScreen from './src/screens/ShopScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import CartScreen from './src/screens/CartScreen';
import AccountScreen from './src/screens/AccountScreen';
import ProductScreen from './src/screens/ProductScreen';
import SellerSignupScreen from './src/screens/SellerSignupScreen';
import OrderSuccessScreen from './src/screens/OrderSuccessScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import LoginScreen from './src/screens/LoginScreen';
import WriteReviewScreen from './src/screens/WriteReviewScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ReturnRequestScreen from './src/screens/ReturnRequestScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import Splash from './src/components/Splash';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICON: Record<string, {icon: IconName; label: string}> = {
  Home: {icon: 'home', label: 'Home'},
  Shop: {icon: 'search', label: 'Shop'},
  Wishlist: {icon: 'heart', label: 'Wishlist'},
  Cart: {icon: 'bag', label: 'Bag'},
  Account: {icon: 'user', label: 'Account'},
};

function Tabs() {
  const {count, wishlist} = useStore();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#A39C92',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
        tabBarBadgeStyle: {backgroundColor: colors.gold, fontSize: 9, minWidth: 16, height: 16, lineHeight: 15},
        tabBarIcon: ({color, focused}) => (
          <View style={{alignItems: 'center'}} accessibilityLabel={TAB_ICON[route.name].label}>
            <Icon
              name={TAB_ICON[route.name].icon}
              color={color}
              size={23}
              strokeWidth={focused ? 1.8 : 1.4}
              fill={route.name === 'Wishlist' && focused ? color : 'none'}
            />
            <View style={{width: 4, height: 4, borderRadius: 2, marginTop: 6, backgroundColor: focused ? colors.gold : 'transparent'}} />
          </View>
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} options={{tabBarBadge: wishlist.length || undefined}} />
      <Tab.Screen name="Cart" component={CartScreen} options={{tabBarBadge: count || undefined}} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const theme = {...DefaultTheme, colors: {...DefaultTheme.colors, background: colors.bg}};

function Root() {
  const {ready, onboarded} = useStore();
  const [splash, setSplash] = useState(true);
  const finishSplash = useCallback(() => setSplash(false), []);
  return (
    <View style={{flex: 1, backgroundColor: colors.bg}}>
      {ready && (
        <NavigationContainer theme={theme}>
          <Stack.Navigator
            initialRouteName={onboarded ? 'Tabs' : 'Welcome'}
            screenOptions={{headerShown: false, statusBarStyle: 'dark', animation: 'fade_from_bottom'}}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{statusBarStyle: 'light', animation: 'fade'}} />
            <Stack.Screen name="Tabs" component={Tabs} options={{animation: 'fade'}} />
            <Stack.Screen name="Product" component={ProductScreen} options={{animation: 'slide_from_right'}} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{animation: 'slide_from_right'}} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{gestureEnabled: false, animation: 'fade'}} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{animation: 'slide_from_right'}} />
            <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{gestureEnabled: false, animation: 'slide_from_bottom'}} />
            <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} options={{animation: 'slide_from_right'}} />
            <Stack.Screen name="Login" component={LoginScreen} options={{animation: 'slide_from_bottom', statusBarStyle: 'light'}} />
            <Stack.Screen name="SellerSignup" component={SellerSignupScreen} options={{animation: 'slide_from_right'}} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{animation: 'slide_from_right'}} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
      {splash && <Splash ready={ready} onDone={finishSplash} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

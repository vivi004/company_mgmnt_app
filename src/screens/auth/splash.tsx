import React, { useEffect } from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { isAuthenticated } from '../../services/authService';

const { width } = Dimensions.get('window');

export default function Splash() {
  const router = useRouter();
  
  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);

  useEffect(() => {
    // Start animations
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 1000 });
    
    textOpacity.value = withDelay(600, withTiming(1, { duration: 1000 }));
    textTranslateY.value = withDelay(600, withSpring(0));

    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        
        // Ensure the splash is visible long enough for the user to appreciate the branding
        setTimeout(() => {
          if (authenticated) {
            router.replace('/(drawer)/product-rates');
          } else {
            router.replace('/login');
          }
        }, 2500);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/login');
      }
    };

    checkAuth();
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View className='flex-1 justify-center items-center bg-white'>
      <Animated.View style={[logoStyle, { alignItems: 'center' }]}>
        <View className='shadow-2xl bg-white rounded-3xl p-4'>
          <Image 
            source={require('../../../assets/dw_img/Logo.png')} 
            className='w-48 h-48'
            resizeMode="contain"
          />
        </View>
      </Animated.View>
      
      <Animated.View style={[textStyle, { marginTop: 24, alignItems: 'center' }]}>
        <Text className='text-6xl font-serif font-bold text-black tracking-tight'>
          Nisha
        </Text>
        <View className='h-1 w-12 bg-yellow-500 mt-2 rounded-full' />
        <Text className='text-gray-400 mt-4 font-medium tracking-[4px] uppercase text-xs'>
          Since 1995
        </Text>
      </Animated.View>

      <View className='absolute bottom-12'>
        <Text className='text-gray-300 text-xs font-light'>
          Premium Quality Products
        </Text>
      </View>
    </View>
  );
}


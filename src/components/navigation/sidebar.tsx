import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logout } from '../../services/authService';
import { useRouter } from 'expo-router';

export default function CustomSidebar(props: DrawerContentComponentProps) {
  const router = useRouter();
  
  // Get current active route from state safely
  const activeIndex = props.state?.index ?? 0;
  const activeRouteName = props.state?.routes[activeIndex]?.name ?? '';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const navItems = [
    { name: 'Product Rates', route: 'product-rates', icon: 'tag' },
    { name: 'Order Lines', route: 'order-lines', icon: 'clipboard' },
    { name: 'Bill Check', route: 'bill-check', icon: 'check-circle' },
    { name: 'Today Collection', route: 'collections', icon: 'bar-chart-2' },
    { name: 'Settings', route: 'settings', icon: 'settings' }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={['top', 'bottom']}>
      {/* Header Section */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Image 
              source={require('../../../assets/dw_img/Logo.png')} 
              style={{ width: 48, height: 48 }}
              resizeMode="contain" 
            />
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '900' }}>Nisha</Text>
            <Text style={{ color: '#60A5FA', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 }}>
              STAFF ACCESS
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Navigation Items */}
        <View style={{ gap: 8 }}>
          {navItems.map((item, index) => {
            const isActive = activeRouteName === item.route;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(`/(drawer)/${item.route}` as any)}
                activeOpacity={0.7}
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: isActive ? '#2563EB' : 'transparent',
                }}
              >
                <View style={{
                  padding: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isActive ? 'rgba(255,255,255,0.3)' : '#334155',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#1E293B',
                }}>
                  <Feather name={item.icon as any} size={20} color={isActive ? 'white' : '#94A3B8'} />
                </View>
                <Text style={{
                  marginLeft: 16,
                  fontWeight: 'bold',
                  color: isActive ? 'white' : '#94A3B8',
                }}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer / Logout */}
      <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
        <TouchableOpacity 
          onPress={handleLogout} 
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Feather name="log-out" size={20} color="#94A3B8" />
          <Text style={{ marginLeft: 16, color: '#94A3B8', fontWeight: 'bold' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

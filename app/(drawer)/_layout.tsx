import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import CustomSidebar from '../../src/components/navigation/sidebar';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomSidebar {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: 320,
            backgroundColor: 'transparent', // Custom handler manages background
          },
        }}
      >
        <Drawer.Screen name="product-rates" />
        <Drawer.Screen name="order-lines" />
        <Drawer.Screen name="shop-list" />
        <Drawer.Screen name="ordering" />
        <Drawer.Screen name="bill-check" />
        <Drawer.Screen name="collections" />
        <Drawer.Screen name="settings" />
        <Drawer.Screen 
          name="invoice" 
          options={{ drawerItemStyle: { display: 'none' } }} 
        />
        {/* Future routes will be added here */}
      </Drawer>
    </GestureHandlerRootView>
  );
}

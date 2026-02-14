import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.apricot,
        tabBarInactiveTintColor: '#A89A8F',
        tabBarStyle: {
          backgroundColor: Colors.milk,
          borderTopColor: 'rgba(45,36,32,0.08)',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let name: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'index':
              name = focused ? 'restaurant' : 'restaurant-outline';
              break;
            case 'menu':
              name = focused ? 'heart' : 'heart-outline';
              break;
            case 'planner':
              name = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'groceries':
              name = focused ? 'bag' : 'bag-outline';
              break;
            case 'creator':
              name = focused ? 'create' : 'create-outline';
              break;
            case 'profile':
              name = focused ? 'person' : 'person-outline';
              break;
            default:
              name = 'ellipse';
          }

          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover' }} />
      <Tabs.Screen name="menu" options={{ title: 'Saved' }} />
      <Tabs.Screen name="planner" options={{ title: 'Plan' }} />
      <Tabs.Screen name="groceries" options={{ title: 'Shop' }} />
      <Tabs.Screen name="creator" options={{ title: 'Create' }} />
      <Tabs.Screen name="profile" options={{ title: 'Me' }} />
    </Tabs>
  );
}


import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomTabBar } from '../../src/components/CustomTabBar';

const tabs = [
  { name: 'chat', label: 'Sleep Assistant', icon: '💤', iconName: 'sleep', route: '/(tabs)/chat' },
  { name: 'forum', label: 'Village', icon: '🏘️', iconName: 'forum', route: '/(tabs)/forum' },
  { name: 'friends', label: 'Friends', icon: '👥', iconName: 'users', route: '/(tabs)/friends' },
];

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    // Determine active tab from current route
    const currentRoute = segments[segments.length - 1] || 'chat';
    setActiveTab(currentRoute);
  }, [segments]);

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <CustomTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

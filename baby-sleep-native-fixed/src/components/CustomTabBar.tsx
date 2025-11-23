/**
 * Custom Tab Bar Component - Workaround for Tabs boolean type error
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MinimalIcon from './icons/MinimalIcon';

interface Tab {
  name: string;
  label: string;
  icon: string;
  iconName?: string; // SVG icon name for MinimalIcon
  route: string;
}

interface CustomTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (route: string) => void;
}

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={[
            styles.tab,
            activeTab === tab.name && styles.activeTab,
          ]}
          onPress={() => onTabPress(tab.route)}
        >
          {tab.iconName ? (
            <View style={styles.tabIconContainer}>
              <MinimalIcon
                name={tab.iconName}
                size={20}
                color={activeTab === tab.name ? '#3a1f35' : '#999'}
              />
            </View>
          ) : (
            <Text style={styles.tabIcon}>{tab.icon}</Text>
          )}
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.name && styles.activeTabLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Active state styling
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabIconContainer: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#999',
  },
  activeTabLabel: {
    color: '#3a1f35',
    fontWeight: '600',
  },
});


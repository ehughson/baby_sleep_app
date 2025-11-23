/**
 * User Menu Dropdown Component
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import MinimalIcon from './icons/MinimalIcon';

interface UserMenuProps {
  visible: boolean;
  onClose: () => void;
  onProfile: () => void;
  onBabyProfile: () => void;
  onSleepGoals: () => void;
  onSleepProgress?: () => void;
  onLogout: () => void;
  onDeactivate: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  visible,
  onClose,
  onProfile,
  onBabyProfile,
  onSleepGoals,
  onSleepProgress,
  onLogout,
  onDeactivate,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menu} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.menuItem} onPress={onProfile}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuIcon}>
                <MinimalIcon name="profile" size={16} color="#333" />
              </View>
              <Text style={styles.menuItemText}>Profile</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onBabyProfile}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuIcon}>
                <MinimalIcon name="baby" size={16} color="#333" />
              </View>
              <Text style={styles.menuItemText}>Baby Profile</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onSleepGoals}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuIcon}>
                <MinimalIcon name="target" size={16} color="#333" />
              </View>
              <Text style={styles.menuItemText}>Sleep Goals</Text>
            </View>
          </TouchableOpacity>
          {onSleepProgress && (
            <TouchableOpacity style={styles.menuItem} onPress={onSleepProgress}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuIcon}>
                  <MinimalIcon name="calendar" size={16} color="#333" />
                </View>
                <Text style={styles.menuItemText}>Sleep Progress</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuIcon}>
                <MinimalIcon name="exit" size={16} color="#333" />
              </View>
              <Text style={styles.menuItemText}>Logout</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onDeactivate}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuIcon}>
                <MinimalIcon name="warning" size={16} color="#dc3545" />
              </View>
              <Text style={[styles.menuItemText, styles.dangerText]}>Deactivate Account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  dangerText: {
    color: '#dc3545',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
});


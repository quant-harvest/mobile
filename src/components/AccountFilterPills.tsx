import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SchwabAccountOption } from '../types/portfolio';

interface Props {
  accounts: SchwabAccountOption[];
  selectedAccount: string;
  onSelectAccount: (acc: string) => void;
}

export const AccountFilterPills: React.FC<Props> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.pill,
            selectedAccount === 'ALL' && styles.pillActive,
          ]}
          onPress={() => onSelectAccount('ALL')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              selectedAccount === 'ALL' && styles.pillTextActive,
            ]}
          >
            All Accounts
          </Text>
        </TouchableOpacity>

        {accounts.map((acc) => {
          const isSelected = selectedAccount === acc.accountNumber;
          const displayNum = acc.accountNumber.length > 4
            ? `...${acc.accountNumber.slice(-4)}`
            : acc.accountNumber;
          const label = acc.nickName ? `${acc.nickName} (${displayNum})` : `#${displayNum}`;

          return (
            <TouchableOpacity
              key={acc.accountNumber}
              style={[
                styles.pill,
                isSelected && styles.pillActive,
              ]}
              onPress={() => onSelectAccount(acc.accountNumber)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected && styles.pillTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: '#0d1117',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  pillActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b949e',
  },
  pillTextActive: {
    color: '#0d1117',
    fontWeight: '700',
  },
});

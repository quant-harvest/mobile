import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PositionsScreen } from './src/screens/PositionsScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <PositionsScreen />
    </SafeAreaProvider>
  );
}

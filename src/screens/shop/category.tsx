import React from 'react';
import { View, Text } from 'react-native';

export default function Category() {
  return (
    <View className='flex-1 justify-center items-center bg-white dark:bg-black'>
      <Text className='text-lg font-bold text-black dark:text-white'>Category Component</Text>
    </View>
  );
}


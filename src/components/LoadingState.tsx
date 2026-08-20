import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ColorTheme} from '../theme/colors';

interface Props {
  themeColors: ColorTheme;
}

export function LoadingState({themeColors}: Props) {
  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <Text style={[styles.text, {color: themeColors.text}]}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {fontSize: 18},
});

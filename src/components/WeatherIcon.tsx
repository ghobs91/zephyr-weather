import React from 'react';
import {View, StyleProp, ViewStyle} from 'react-native';
import {WeatherCode} from '../types/weather';
import {getWeatherIconComponent} from '../utils/weatherIcons';

interface Props {
  code?: WeatherCode;
  isDay?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WeatherIcon({code, isDay = true, style}: Props) {
  const SvgComponent = getWeatherIconComponent(code, isDay);
  const flatStyle = style ? (Array.isArray(style) ? Object.assign({}, ...style) : style) as any : {};
  const width: number = flatStyle.width ?? 32;
  const height: number = flatStyle.height ?? 32;
  return (
    <View style={style}>
      <SvgComponent width={width} height={height} />
    </View>
  );
}

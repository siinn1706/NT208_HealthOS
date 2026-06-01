import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

export function HealthOSBrandMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 181.67 181.67">
      <Defs>
        <LinearGradient id="healthosLogoA" x1="0.58" y1="0.58" x2="117.83" y2="117.83" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#48B0E0" />
          <Stop offset="0.82" stopColor="#2C62D6" />
        </LinearGradient>
        <LinearGradient id="healthosLogoB" x1="98.08" y1="98.08" x2="178.09" y2="178.09" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#48B0E0" />
          <Stop offset="0.82" stopColor="#2C62D6" />
        </LinearGradient>
      </Defs>
      <G>
        <Path
          fill="url(#healthosLogoA)"
          d="m90.8,100.73c2.59-4.54,4.27-9.53,6.06-14.81,1.85-5.49,3.76-11.16,6.81-16.38,4-6.87,9.89-12.57,16.77-16.54V9.87c0-5.45-4.42-9.87-9.87-9.87h-39.46c-5.45,0-9.87,4.42-9.87,9.87v51.37H9.87c-5.45,0-9.87,4.42-9.87,9.87v39.46c0,5.45,4.42,9.87,9.87,9.87h50.98c12.3-1.46,23.81-8.92,29.96-19.7Z"
        />
        <Path
          fill="url(#healthosLogoB)"
          d="m171.81,61.24h-51.28c-4.37,3.14-8.1,7.16-10.81,11.82-2.68,4.61-4.4,9.71-6.22,15.1-1.81,5.37-3.68,10.91-6.61,16.04-7.3,12.8-21.02,21.63-35.64,23.23v44.37c0,5.45,4.42,9.87,9.87,9.87h39.46c5.45,0,9.87-4.42,9.87-9.87v-51.37h51.37c5.45,0,9.87-4.42,9.87-9.87v-39.46c0-5.45-4.42-9.87-9.87-9.87Z"
        />
        <Path
          fill="#FFFFFF"
          opacity={0.25}
          d="m120.19,7.72c-.98-4.41-4.91-7.72-9.62-7.72h-39.46c-5.45,0-9.87,4.42-9.87,9.87v51.37H9.87c-5.45,0-9.87,4.42-9.87,9.87v39.46c0,1.24.24,2.42.66,3.51,23.09.07,46.12-10.78,60.39-29.01,6.16-7.88,10.73-16.85,15.56-26.36,5.02-9.87,10.22-20.08,17.42-29.12,7.14-8.96,16.12-16.37,26.16-21.88Z"
        />
      </G>
    </Svg>
  );
}

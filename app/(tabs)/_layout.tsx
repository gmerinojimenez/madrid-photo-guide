import { Tabs } from 'expo-router';

import { Icon } from '../../src/ui/components/Icon.tsx';
import { colors } from '../../src/ui/theme/tokens.ts';

/** Las cuatro secciones permanentes de la app (FR-001, contracts/routes.md). */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.neutral500,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Icon name="mapTrifold" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tips"
        options={{
          title: 'Consejos',
          tabBarIcon: ({ color, size }) => <Icon name="listDashes" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Guardados',
          tabBarIcon: ({ color, size }) => <Icon name="bookmarkSimple" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icon name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

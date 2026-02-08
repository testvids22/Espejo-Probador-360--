import { Tabs } from "expo-router";
import { Home, Scan, Shirt, Carrot, User, BarChart2, Edit3, Ruler, RotateCw, Settings } from "lucide-react-native";
import React from "react";

import Colors from "@/constants/colors";
import { VoiceCommandSuggestions } from "@/components/VoiceCommandSuggestions";
import { AutoNavigate360 } from "@/components/AutoNavigate360";
import { InactivityScreensaver } from "@/components/InactivityScreensaver";

export default function TabLayout() {
  return (
    <InactivityScreensaver>
      <AutoNavigate360 />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.light.tint,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.light.card,
            borderTopWidth: 1,
            borderTopColor: Colors.light.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600' as const,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: "Scanner",
            tabBarIcon: ({ color }) => <Scan size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: "Catálogo",
            tabBarIcon: ({ color }) => <Shirt size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="mirror"
          options={{
            title: "Espejo",
            tabBarIcon: ({ color }) => <Carrot size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="apps3d"
          options={{
            title: "Analíticas",
            tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="editor"
          options={{
            title: "Editor",
            tabBarIcon: ({ color }) => <Edit3 size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="size-detector"
          options={{
            title: "Tallas",
            tabBarIcon: ({ color }) => <Ruler size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tryon-360"
          options={{
            title: "360º",
            tabBarIcon: ({ color }) => <RotateCw size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />
      </Tabs>
      <VoiceCommandSuggestions />
    </InactivityScreensaver>
  );
}

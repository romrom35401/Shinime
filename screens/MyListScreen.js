// screens/MyListScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MyListScreen({ navigation }) {
  const handleOpenPlayer = () => {
    navigation.navigate("Player", {
      anime: { title: { romaji: "Test Local Video" } },
      episode: {
        number: 1,
        url: require("../assets/test.mp4"), // 👈 vidéo locale
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📺 My List (Test)</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleOpenPlayer}>
        <Ionicons name="play" size={20} color="#fff" />
        <Text style={styles.buttonText}>Lire mon test.mp4</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e91e63",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },
});

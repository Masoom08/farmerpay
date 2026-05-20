import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import type { Season } from "../utils/season.util";
import { getSeasonLabel } from "../utils/season.util";

interface SeasonSelectorProps {
  value: Season;
  onChange: (season: Season) => void;
}

const seasons: Season[] = ["kharif", "rabi", "zaid"];

const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <View style={styles.row}>
      {seasons.map((season) => (
        <TouchableOpacity
          key={season}
          style={[
            styles.button,
            value === season && styles.activeButton,
          ]}
          onPress={() => onChange(season)}
        >
          <Text
            style={[
              styles.text,
              value === season && styles.activeText,
            ]}
          >
            {getSeasonLabel(season)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SeasonSelector;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },

  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },

  activeButton: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },

  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },

  activeText: {
    color: "#ffffff",
  },
});
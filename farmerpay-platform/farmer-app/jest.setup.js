/**
 * Jest setup for farmer-app.
 * Mocks native modules that don't work in the test environment.
 */

// Mock @expo/vector-icons — renders a plain <Text> with the icon name
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  const React = require("react");

  const createMockIcon = (iconSetName) => {
    const MockIcon = ({ name, size, color, style, ...rest }) =>
      React.createElement(Text, {
        ...rest,
        style: [{ fontSize: size, color }, style],
        children: `[${iconSetName}:${name}]`,
      });
    MockIcon.displayName = iconSetName;
    MockIcon.glyphMap = new Proxy({}, { get: (_, key) => key });
    return MockIcon;
  };

  return {
    Ionicons: createMockIcon("Ionicons"),
    MaterialIcons: createMockIcon("MaterialIcons"),
    FontAwesome: createMockIcon("FontAwesome"),
    Feather: createMockIcon("Feather"),
  };
});

/**
 * Metro Config — FarmerPay Farmer App
 *
 * Optimizations:
 *  1. Excludes unused icon font files from the bundle (saves ~3.6 MB)
 *     Only Ionicons is used in the app — all other 17 families are dropped.
 */

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Pin Metro to this project only — prevent walking up into sibling/parent
// dirs (e.g. the duplicate `farmerpay-platform-main/` or the backend's
// `src/app.js`, which uses Node-only `require('path')` and breaks RN bundling).
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Block any path that lives outside this project root from being resolved
// (covers the sibling `farmerpay-platform-main/` copy and the backend `src/`).
const projectRoot = __dirname;
const outsideProjectRegex = new RegExp(
  `^(?!${projectRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}).*[\\\\/]src[\\\\/]app\\.js$`
);

// Block unused icon font files from being bundled.
// The app only uses Ionicons — everything else is dead weight.
const UNUSED_ICON_FONTS = [
  "MaterialIcons",
  "MaterialCommunityIcons",
  "FontAwesome.b",       // FontAwesome v4
  "FontAwesome5_Solid",
  "FontAwesome5_Regular",
  "FontAwesome5_Brands",
  "FontAwesome6_Solid",
  "FontAwesome6_Regular",
  "FontAwesome6_Brands",
  "Feather",
  "Entypo",
  "AntDesign",
  "Foundation",
  "EvilIcons",
  "Octicons",
  "SimpleLineIcons",
  "Fontisto",
  "Zocial",
];

// Build a regex that matches any of the unused font filenames
const fontBlockRegex = new RegExp(
  `(${UNUSED_ICON_FONTS.join("|")})\\..*\\.(ttf|otf|woff|woff2)$`
);

// Add to Metro's blockList (files matching this pattern won't be bundled)
const { assetExts } = config.resolver;
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  fontBlockRegex,
  outsideProjectRegex,
  /[\\/]farmerpay-platform-main[\\/].*/,
];

module.exports = config;

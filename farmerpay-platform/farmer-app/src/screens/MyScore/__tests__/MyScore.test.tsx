/**
 * MyScore Screen + TopBar + LocaleSwitcher — Unit Tests (E1)
 *
 * Tests:
 *   SCREEN
 *   1.  Screen renders with SafeAreaView
 *   2.  ScrollView present
 *   3.  TopBar renders with title
 *   4.  Default title is Hindi ("मेरा स्कोर") when no saved preference
 *   5.  Subtitle visible
 *
 *   TOPBAR
 *   6.  TopBar shows locale switcher on right
 *   7.  Back button hidden by default
 *   8.  Back button shown when showBack=true
 *   9.  Back button fires onBack
 *  10.  TopBar has header accessibility role
 *
 *   LOCALE SWITCHER
 *  11.  Shows "हिंदी" when locale is en
 *  12.  Shows "English" when locale is hi
 *  13.  Toggle from hi → en updates title to "My Score"
 *  14.  Toggle from en → hi updates title to "मेरा स्कोर"
 *  15.  Preference persisted to AsyncStorage
 *  16.  Reads saved preference on mount
 *  17.  Has accessibility label
 *
 *   resolveDefaultLocale
 *  18.  null → 'hi'
 *  19.  'en-IN' → 'hi' (Indian English → Hindi)
 *  20.  'en-US' → 'en'
 *  21.  'hi-IN' → 'hi'
 *  22.  'mr-IN' → 'hi' (Indian non-Hindi → Hindi)
 *  23.  'en' → 'en'
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { MyScoreScreen } from "../index";
import { LocaleSwitcher, LOCALE_STORAGE_KEY } from "../../../components/TopBar";
import { resolveDefaultLocale } from "../../../../lib/myScoreStrings";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Mocks ─────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: (props: any) => React.createElement(View, props),
    SafeAreaProvider: (props: any) => React.createElement(View, props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ─── Screen tests ───────────────────────────────────────────────

describe("MyScoreScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("screen renders with SafeAreaView", async () => {
    render(<MyScoreScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("my-score-screen")).toBeTruthy();
    });
  });

  it("ScrollView present", async () => {
    render(<MyScoreScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("my-score-scroll")).toBeTruthy();
    });
  });

  it("TopBar renders with title", async () => {
    render(<MyScoreScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("my-score-topbar")).toBeTruthy();
    });
  });

  it('default title is Hindi ("मेरा स्कोर") when no saved preference', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(<MyScoreScreen />);

    // Default is 'hi' since resolveDefaultLocale(null) → 'hi'
    await waitFor(() => {
      expect(screen.getByText("मेरा स्कोर")).toBeTruthy();
    });
  });

  it("subtitle visible", async () => {
    render(
      <MyScoreScreen
        aaLinked={true}
        score={650}
        lastSync={new Date().toISOString()}
        isOnline={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("my-score-subtitle")).toBeTruthy();
    });
  });
});

// ─── TopBar tests ───────────────────────────────────────────────

describe("MyScoreScreen (TopBar)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("TopBar shows locale switcher on right", async () => {
    render(<MyScoreScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("locale-switcher")).toBeTruthy();
    });
  });

  it("back button hidden by default", async () => {
    render(<MyScoreScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("my-score-topbar")).toBeTruthy();
    });

    expect(screen.queryByTestId("topbar-back-btn")).toBeNull();
  });

  it("back button shown when showBack=true", async () => {
    render(<MyScoreScreen showBack onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("topbar-back-btn")).toBeTruthy();
    });
  });

  it("back button fires onBack", async () => {
    const onBack = jest.fn();
    render(<MyScoreScreen showBack onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId("topbar-back-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("topbar-back-btn"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("TopBar has header accessibility role", async () => {
    render(<MyScoreScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("my-score-topbar")).toBeTruthy();
    });

    const topbar = screen.getByTestId("my-score-topbar");
    expect(topbar.props.accessibilityRole).toBe("header");
  });
});

// ─── LocaleSwitcher tests ───────────────────────────────────────

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('shows "हिंदी" when locale is en', () => {
    render(
      <LocaleSwitcher currentLocale="en" onLocaleChange={jest.fn()} testID="ls" />,
    );

    expect(screen.getByTestId("ls-label")).toBeTruthy();
    expect(screen.getByText("हिंदी")).toBeTruthy();
  });

  it('shows "English" when locale is hi', () => {
    render(
      <LocaleSwitcher currentLocale="hi" onLocaleChange={jest.fn()} testID="ls" />,
    );

    expect(screen.getByText("English")).toBeTruthy();
  });

  it('toggle from hi → en updates title to "My Score"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("hi");

    render(<MyScoreScreen />);

    // Wait for initial render with Hindi
    await waitFor(() => {
      expect(screen.getByText("मेरा स्कोर")).toBeTruthy();
    });

    // Toggle to English
    fireEvent.press(screen.getByTestId("locale-switcher"));

    await waitFor(() => {
      expect(screen.getByText("My Score")).toBeTruthy();
    });
  });

  it('toggle from en → hi updates title to "मेरा स्कोर"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("en");

    render(<MyScoreScreen />);

    // Wait for initial render with English
    await waitFor(() => {
      expect(screen.getByText("My Score")).toBeTruthy();
    });

    // Toggle to Hindi
    fireEvent.press(screen.getByTestId("locale-switcher"));

    await waitFor(() => {
      expect(screen.getByText("मेरा स्कोर")).toBeTruthy();
    });
  });

  it("preference persisted to AsyncStorage", async () => {
    const onLocaleChange = jest.fn();

    render(
      <LocaleSwitcher currentLocale="en" onLocaleChange={onLocaleChange} />,
    );

    fireEvent.press(screen.getByTestId("locale-switcher"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        LOCALE_STORAGE_KEY,
        "hi",
      );
    });

    expect(onLocaleChange).toHaveBeenCalledWith("hi");
  });

  it("reads saved preference on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("en");

    render(<MyScoreScreen />);

    // Should show English title from saved preference
    await waitFor(() => {
      expect(screen.getByText("My Score")).toBeTruthy();
    });
  });

  it("has accessibility label", () => {
    render(
      <LocaleSwitcher currentLocale="en" onLocaleChange={jest.fn()} />,
    );

    const switcher = screen.getByTestId("locale-switcher");
    expect(switcher.props.accessibilityRole).toBe("button");
    expect(switcher.props.accessibilityLabel).toContain("Switch language");
  });
});

// ─── resolveDefaultLocale tests ─────────────────────────────────

describe("resolveDefaultLocale", () => {
  it("null → 'hi'", () => {
    expect(resolveDefaultLocale(null)).toBe("hi");
  });

  it("'en-IN' → 'hi' (Indian English → Hindi)", () => {
    expect(resolveDefaultLocale("en-IN")).toBe("hi");
  });

  it("'en-US' → 'en'", () => {
    expect(resolveDefaultLocale("en-US")).toBe("en");
  });

  it("'hi-IN' → 'hi'", () => {
    expect(resolveDefaultLocale("hi-IN")).toBe("hi");
  });

  it("'mr-IN' → 'hi' (Indian non-Hindi → Hindi)", () => {
    expect(resolveDefaultLocale("mr-IN")).toBe("hi");
  });

  it("'en' → 'en'", () => {
    expect(resolveDefaultLocale("en")).toBe("en");
  });

  it("'hi' → 'hi'", () => {
    expect(resolveDefaultLocale("hi")).toBe("hi");
  });

  it("'fr-FR' → 'hi' (unrecognised → Hindi fallback)", () => {
    expect(resolveDefaultLocale("fr-FR")).toBe("hi");
  });
});

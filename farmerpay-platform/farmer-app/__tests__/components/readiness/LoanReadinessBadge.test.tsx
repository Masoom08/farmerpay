/**
 * LoanReadinessBadge — Snapshot + accessibility tests.
 * Covers all 4 states, pressable/non-pressable, and language variants.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";
import LoanReadinessBadge from "../../../components/readiness/LoanReadinessBadge";
import type { ReadinessState } from "../../../lib/readinessStrings";

const STATES: ReadinessState[] = ["ready", "almost", "notReady", "needsData"];

describe("LoanReadinessBadge", () => {
  // ─── Snapshot per state ──────────────────────────────────

  describe("snapshots", () => {
    for (const state of STATES) {
      it(`renders state="${state}" correctly`, () => {
        let tree: renderer.ReactTestRenderer;
        act(() => {
          tree = renderer.create(
            <LoanReadinessBadge state={state} onPress={() => {}} />
          );
        });
        expect(tree!.toJSON()).toMatchSnapshot();
      });
    }

    it("renders without onPress (non-pressable)", () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<LoanReadinessBadge state="ready" />);
      });
      expect(tree!.toJSON()).toMatchSnapshot();
    });
  });

  // ─── Accessibility ───────────────────────────────────────

  describe("accessibility", () => {
    for (const state of STATES) {
      it(`state="${state}" has accessibilityLabel and accessibilityHint`, () => {
        let instance: renderer.ReactTestRenderer;
        act(() => {
          instance = renderer.create(
            <LoanReadinessBadge state={state} onPress={() => {}} />
          );
        });
        const root = instance!.root;

        // Find the TouchableOpacity (pressable wrapper)
        const touchable = root.findByProps({ accessibilityRole: "button" });
        expect(touchable).toBeDefined();
        expect(touchable.props.accessibilityLabel).toBeTruthy();
        expect(touchable.props.accessibilityHint).toBeTruthy();
        expect(touchable.props.accessibilityHint).toContain("Tap");
      });
    }
  });

  // ─── Color safety ────────────────────────────────────────

  describe("color safety", () => {
    it('"notReady" does not use red colors', () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <LoanReadinessBadge state="notReady" onPress={() => {}} />
        );
      });
      const json = JSON.stringify(tree!.toJSON());
      // Should not contain red-family hex codes
      expect(json).not.toMatch(/#[cCdDeE][0-6][0-9a-fA-F]{4}/);
      // Should contain neutral grey (#6B7280)
      expect(json).toContain("#6B7280");
    });
  });

  // ─── Language variants ───────────────────────────────────

  describe("language support", () => {
    it("renders Hindi labels", () => {
      let instance: renderer.ReactTestRenderer;
      act(() => {
        instance = renderer.create(
          <LoanReadinessBadge state="ready" lang="hi" onPress={() => {}} />
        );
      });
      const root = instance!.root;
      const touchable = root.findByProps({ accessibilityRole: "button" });
      expect(touchable.props.accessibilityLabel).toBe("तैयार");
    });

    it("renders Kannada labels", () => {
      let instance: renderer.ReactTestRenderer;
      act(() => {
        instance = renderer.create(
          <LoanReadinessBadge state="ready" lang="kn" onPress={() => {}} />
        );
      });
      const root = instance!.root;
      const touchable = root.findByProps({ accessibilityRole: "button" });
      expect(touchable.props.accessibilityLabel).toBe("ಸಿದ್ಧ");
    });

    it("falls back to English for unknown lang", () => {
      let instance: renderer.ReactTestRenderer;
      act(() => {
        instance = renderer.create(
          <LoanReadinessBadge state="ready" lang={"xx" as any} onPress={() => {}} />
        );
      });
      const root = instance!.root;
      const touchable = root.findByProps({ accessibilityRole: "button" });
      expect(touchable.props.accessibilityLabel).toBe("Loan-Ready");
    });
  });
});

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TRUST Sanction Review | FarmerPay",
  description: "Review TRUST v2 score, pillars, evidence, and record sanction decision.",
};

/**
 * Layout for the TRUST Sanction Review route.
 *
 * Provides the 12-col desktop grid shell with 24px gutters and max-w of 1440px.
 * The layout itself is static (no runtime data), so loading.tsx can show instantly.
 */
export default function TrustReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="trust-review-layout"
      className="mx-auto w-full max-w-[1440px] px-6"
    >
      {children}
    </div>
  );
}

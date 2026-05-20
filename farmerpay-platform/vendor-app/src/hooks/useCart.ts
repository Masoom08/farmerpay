import { useMemo, useState } from "react";

import type { CartItem, CatalogItem } from "../types/sale.types";

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  /**
   * Add item to cart.
   * If item already exists, increase quantity by 1.
   */
  const addToCart = (item: CatalogItem) => {
    const itemId = item.input_item_id || item.inputItemId;
    const price =
      item.vendor_selling_price || item.vendorSellingPrice || 0;

    setCart((prev) => {
      const existing = prev.find(
        (cartItem) =>
          (cartItem.item.input_item_id ||
            cartItem.item.inputItemId) === itemId
      );

      if (existing) {
        return prev.map((cartItem) =>
          (cartItem.item.input_item_id ||
            cartItem.item.inputItemId) === itemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...prev,
        {
          item,
          quantity: 1,
          price,
        },
      ];
    });
  };

  /**
   * Increase quantity by 1
   */
  const incrementQuantity = (itemId: number) => {
    setCart((prev) =>
      prev.map((cartItem) =>
        (cartItem.item.input_item_id ||
          cartItem.item.inputItemId) === itemId
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
            }
          : cartItem
      )
    );
  };

  /**
   * Decrease quantity by 1.
   * Remove item if quantity becomes 0.
   */
  const decrementQuantity = (itemId: number) => {
    setCart((prev) =>
      prev
        .map((cartItem) =>
          (cartItem.item.input_item_id ||
            cartItem.item.inputItemId) === itemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity - 1,
              }
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  };

  /**
   * Set exact quantity.
   * Removes item if quantity <= 0.
   */
  const updateQuantity = (
    itemId: number,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prev) =>
      prev.map((cartItem) =>
        (cartItem.item.input_item_id ||
          cartItem.item.inputItemId) === itemId
          ? {
              ...cartItem,
              quantity,
            }
          : cartItem
      )
    );
  };

  /**
   * Remove item completely
   */
  const removeFromCart = (itemId: number) => {
    setCart((prev) =>
      prev.filter(
        (cartItem) =>
          (cartItem.item.input_item_id ||
            cartItem.item.inputItemId) !== itemId
      )
    );
  };

  /**
   * Clear entire cart
   */
  const clearCart = () => {
    setCart([]);
  };

  /**
   * Check if item is already in cart
   */
  const isInCart = (itemId: number) => {
    return cart.some(
      (cartItem) =>
        (cartItem.item.input_item_id ||
          cartItem.item.inputItemId) === itemId
    );
  };

  /**
   * Get quantity for a specific item
   */
  const getItemQuantity = (itemId: number) => {
    const found = cart.find(
      (cartItem) =>
        (cartItem.item.input_item_id ||
          cartItem.item.inputItemId) === itemId
    );

    return found?.quantity || 0;
  };

  /**
   * Total number of units
   */
  const totalItems = useMemo(
    () =>
      cart.reduce(
        (sum, cartItem) => sum + cartItem.quantity,
        0
      ),
    [cart]
  );

  /**
   * Number of distinct products
   */
  const uniqueItems = cart.length;

  /**
   * Total amount
   */
  const totalAmount = useMemo(
    () =>
      cart.reduce(
        (sum, cartItem) =>
          sum + cartItem.quantity * cartItem.price,
        0
      ),
    [cart]
  );

  return {
    cart,

    // actions
    addToCart,
    incrementQuantity,
    decrementQuantity,
    updateQuantity,
    removeFromCart,
    clearCart,

    // helpers
    isInCart,
    getItemQuantity,

    // totals
    totalItems,
    uniqueItems,
    totalAmount,
  };
};
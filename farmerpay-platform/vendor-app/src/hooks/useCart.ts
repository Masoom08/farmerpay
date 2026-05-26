import { useMemo, useState } from "react";

import type {
  CartItem,
  CatalogItem,
} from "../types/sale.types";

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  /**
   * Add item to cart
   */
  const addToCart = (
    item: CatalogItem
  ) => {
    const itemId = Number(
      item.input_item_id ??
        item.inputItemId ??
        0
    );

    const price = Number(
      item.vendor_selling_price ??
        item.vendorSellingPrice ??
        0
    );

    setCart((prev) => {
      const existing = prev.find(
        (cartItem) =>
          Number(
            cartItem.item
              .input_item_id ??
              cartItem.item
                .inputItemId ??
              0
          ) === itemId
      );

      // already exists → increment
      if (existing) {
        return prev.map((cartItem) =>
          Number(
            cartItem.item
              .input_item_id ??
              cartItem.item
                .inputItemId ??
              0
          ) === itemId
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      // add new
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
   * Increment quantity
   */
  const incrementQuantity = (
    itemId: number
  ) => {
    setCart((prev) =>
      prev.map((cartItem) =>
        Number(
          cartItem.item
            .input_item_id ??
            cartItem.item
              .inputItemId ??
            0
        ) === Number(itemId)
          ? {
              ...cartItem,
              quantity:
                cartItem.quantity + 1,
            }
          : cartItem
      )
    );
  };

  /**
   * Decrement quantity
   */
  const decrementQuantity = (
    itemId: number
  ) => {
    setCart((prev) =>
      prev
        .map((cartItem) =>
          Number(
            cartItem.item
              .input_item_id ??
              cartItem.item
                .inputItemId ??
              0
          ) === Number(itemId)
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity - 1,
              }
            : cartItem
        )
        .filter(
          (cartItem) =>
            cartItem.quantity > 0
        )
    );
  };

  /**
   * Update exact quantity
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
        Number(
          cartItem.item
            .input_item_id ??
            cartItem.item
              .inputItemId ??
            0
        ) === Number(itemId)
          ? {
              ...cartItem,
              quantity,
            }
          : cartItem
      )
    );
  };

  /**
   * Remove item
   */
  const removeFromCart = (
    itemId: number
  ) => {
    setCart((prev) =>
      prev.filter(
        (cartItem) =>
          Number(
            cartItem.item
              .input_item_id ??
              cartItem.item
                .inputItemId ??
              0
          ) !== Number(itemId)
      )
    );
  };

  /**
   * Clear cart
   */
  const clearCart = () => {
    setCart([]);
  };

  /**
   * Check if exists
   */
  const isInCart = (
    itemId: number
  ) => {
    return cart.some(
      (cartItem) =>
        Number(
          cartItem.item
            .input_item_id ??
            cartItem.item
              .inputItemId ??
            0
        ) === Number(itemId)
    );
  };

  /**
   * Get quantity
   */
  const getItemQuantity = (
    itemId: number
  ) => {
    const found = cart.find(
      (cartItem) =>
        Number(
          cartItem.item
            .input_item_id ??
            cartItem.item
              .inputItemId ??
            0
        ) === Number(itemId)
    );

    return found?.quantity || 0;
  };

  /**
   * Total quantity
   */
  const totalItems = useMemo(
    () =>
      cart.reduce(
        (sum, cartItem) =>
          sum + cartItem.quantity,
        0
      ),
    [cart]
  );

  /**
   * Unique products
   */
  const uniqueItems = useMemo(
    () => cart.length,
    [cart]
  );

  /**
   * Total amount
   */
  const totalAmount = useMemo(
    () =>
      cart.reduce(
        (sum, cartItem) =>
          sum +
          cartItem.quantity *
            cartItem.price,
        0
      ),
    [cart]
  );

  return {
    cart,

    addToCart,
    incrementQuantity,
    decrementQuantity,
    updateQuantity,
    removeFromCart,
    clearCart,

    isInCart,
    getItemQuantity,

    totalItems,
    uniqueItems,
    totalAmount,
  };
};
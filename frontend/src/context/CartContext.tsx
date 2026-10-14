"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CartItem = {
  cartItemId: string; // Unique ID per variant (product id + size + color)
  id: string;         // Product ID
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  size?: string;
  color?: string;
  colorHex?: string;
};

export type AddToCartInput = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  size?: string;
  color?: string;
  colorHex?: string;
  cartItemId?: string;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: AddToCartInput) => void;
  removeFromCart: (cartItemIdOrId: string) => void;
  updateQuantity: (cartItemIdOrId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
};

export const getCartItemId = (item: { id: string; size?: string; color?: string; cartItemId?: string }): string => {
  if (item.cartItemId) return item.cartItemId;
  const sizePart = item.size ? item.size.trim().toUpperCase() : 'DEFAULT_SIZE';
  const colorPart = item.color ? item.color.trim().toUpperCase() : 'DEFAULT_COLOR';
  return `${item.id}__sz_${sizePart}__col_${colorPart}`;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore cart safely on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('phygital_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(parsed.map((item: any) => ({
            ...item,
            cartItemId: item.cartItemId || getCartItemId(item)
          })));
        }
      }
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('phygital_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [cart, isHydrated]);

  const addToCart = (item: AddToCartInput) => {
    const targetId = getCartItemId(item);
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(i => (i.cartItemId || getCartItemId(i)) === targetId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity
        };
        return updated;
      }
      return [...prevCart, { ...item, cartItemId: targetId }];
    });
  };

  const removeFromCart = (cartItemIdOrId: string) => {
    setCart((prevCart) =>
      prevCart.filter((i) => {
        const itemId = i.cartItemId || getCartItemId(i);
        // If matches unique cartItemId, remove it
        if (itemId === cartItemIdOrId) return false;
        // Fallback: If passed raw product ID and there's only 1 item with that product ID
        if (i.id === cartItemIdOrId && prevCart.filter(p => p.id === cartItemIdOrId).length === 1) return false;
        return true;
      })
    );
  };

  const updateQuantity = (cartItemIdOrId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemIdOrId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((i) => {
        const itemId = i.cartItemId || getCartItemId(i);
        return (itemId === cartItemIdOrId || i.id === cartItemIdOrId)
          ? { ...i, quantity }
          : i;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};


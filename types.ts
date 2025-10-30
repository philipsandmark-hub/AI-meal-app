// types.ts

export interface AvailableIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Ingredient {
  name:string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  recipeName: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  calories?: number;
  imageUrl?: string;
}

export interface ShoppingListItem {
  name: string;
  amountToBuy: number;
  unit: string;
}

export interface MealType {
  hot: boolean;
  cold: boolean;
}

import { NativeModules, Platform } from 'react-native';

export type LiveActivityRecipe = {
  name: string;
  imageName?: string;
};

type MealSwipeLiveActivityNativeModule = {
  startMealPlanningActivity: (recipes: LiveActivityRecipe[], count: number) => Promise<void> | void;
  updateActivity: (currentRecipe: string, remaining: number) => Promise<void> | void;
  stopActivity: () => Promise<void> | void;
};

function getNativeModule(): MealSwipeLiveActivityNativeModule | null {
  const module = (NativeModules as any)?.MealSwipeLiveActivity as
    | MealSwipeLiveActivityNativeModule
    | undefined;
  return module ?? null;
}

export async function startMealPlanningActivity(params: {
  recipes: LiveActivityRecipe[];
  count: number;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const module = getNativeModule();
  if (!module?.startMealPlanningActivity) return;
  await module.startMealPlanningActivity(params.recipes, params.count);
}

export async function updateMealPlanningActivity(params: {
  currentRecipe: string;
  remaining: number;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const module = getNativeModule();
  if (!module?.updateActivity) return;
  await module.updateActivity(params.currentRecipe, params.remaining);
}

export async function stopMealPlanningActivity(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const module = getNativeModule();
  if (!module?.stopActivity) return;
  await module.stopActivity();
}

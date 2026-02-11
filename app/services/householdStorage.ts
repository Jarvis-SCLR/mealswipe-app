import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

import type { Recipe } from './recipeApi';

// Base64 encode for React Native
function base64Encode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64');
}

export interface HouseholdMember {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  cookUserId: string;
  inviteCode: string;
  members: HouseholdMember[];
}

export type WeeklyPlanStatus = 'selecting' | 'voting' | 'finalized';

export interface VotedRecipe {
  recipeId: string;
  votes: string[];
}

export interface WeeklyPlan {
  id: string;
  householdId: string;
  weekStart: string; // ISO date (YYYY-MM-DD) for Monday
  status: WeeklyPlanStatus;
  proposedRecipes: Recipe[];
  votedRecipes: VotedRecipe[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface ScheduledMeal {
  recipeId: string;
  date: string; // ISO date (YYYY-MM-DD)
  mealType: MealType;
}

const STORAGE_KEYS = {
  household: 'household:v1',
  weeklyPlans: 'weeklyPlans:v1',
  scheduledMeals: 'scheduledMeals:v1',
  deviceUser: 'deviceUser:v1',
} as const;

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function toISODateOnly(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekStartMondayISO(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return toISODateOnly(d);
}

async function getOrCreateDeviceUser() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.deviceUser);
    if (stored) return JSON.parse(stored) as { id: string; name: string };
  } catch {
    // ignore
  }

  const created = {
    id: generateId('user'),
    name: 'You',
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.deviceUser, JSON.stringify(created));
  } catch {
    // ignore
  }

  return created;
}

async function loadWeeklyPlans(): Promise<WeeklyPlan[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.weeklyPlans);
    if (stored) return JSON.parse(stored) as WeeklyPlan[];
  } catch (error) {
    console.warn('Error loading weekly plans:', error);
  }
  return [];
}

async function saveWeeklyPlans(plans: WeeklyPlan[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.weeklyPlans, JSON.stringify(plans));
  } catch (error) {
    console.warn('Error saving weekly plans:', error);
  }
}

async function loadScheduledMeals(): Promise<Record<string, ScheduledMeal[]>> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.scheduledMeals);
    if (stored) return JSON.parse(stored) as Record<string, ScheduledMeal[]>;
  } catch (error) {
    console.warn('Error loading scheduled meals:', error);
  }
  return {};
}

async function saveScheduledMeals(map: Record<string, ScheduledMeal[]>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.scheduledMeals, JSON.stringify(map));
  } catch (error) {
    console.warn('Error saving scheduled meals:', error);
  }
}

export async function createHousehold(name: string) {
  const user = await getOrCreateDeviceUser();

  const household: Household = {
    id: generateId('household'),
    name: name.trim() || 'My Household',
    cookUserId: user.id,
    inviteCode: generateInviteCode(),
    members: [
      {
        id: user.id,
        name: user.name,
        joinedAt: new Date().toISOString(),
      },
    ],
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.household, JSON.stringify(household));
  } catch (error) {
    console.warn('Error creating household:', error);
  }

  return household;
}

export async function joinHousehold(inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();
  const household = await getHousehold();
  const user = await getOrCreateDeviceUser();

  if (!household) {
    throw new Error('No household exists on this device yet.');
  }
  if (household.inviteCode !== code) {
    throw new Error('Invalid invite code.');
  }

  if (!household.members.some((m) => m.id === user.id)) {
    household.members = [
      ...household.members,
      { id: user.id, name: user.name, joinedAt: new Date().toISOString() },
    ];
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.household, JSON.stringify(household));
  } catch (error) {
    console.warn('Error joining household:', error);
  }

  return household;
}

export async function getHousehold(): Promise<Household | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.household);
    if (stored) return JSON.parse(stored) as Household;
  } catch (error) {
    console.warn('Error loading household:', error);
  }
  return null;
}

export async function createWeeklyPlan(householdId: string, weekStart = getWeekStartMondayISO()) {
  const plans = await loadWeeklyPlans();

  const existing = plans.find((p) => p.householdId === householdId && p.weekStart === weekStart);
  if (existing) return existing;

  const plan: WeeklyPlan = {
    id: generateId('plan'),
    householdId,
    weekStart,
    status: 'selecting',
    proposedRecipes: [],
    votedRecipes: [],
  };

  await saveWeeklyPlans([plan, ...plans]);
  return plan;
}

export async function getWeeklyPlan(planId: string): Promise<WeeklyPlan | null> {
  const plans = await loadWeeklyPlans();
  return plans.find((p) => p.id === planId) ?? null;
}

export async function addProposedRecipe(planId: string, recipe: Recipe) {
  const plans = await loadWeeklyPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) throw new Error('Weekly plan not found');

  const plan = plans[idx];
  if (!plan.proposedRecipes.some((r) => r.id === recipe.id)) {
    plan.proposedRecipes = [recipe, ...plan.proposedRecipes];
  }
  if (!plan.votedRecipes.some((v) => v.recipeId === recipe.id)) {
    plan.votedRecipes = [...plan.votedRecipes, { recipeId: recipe.id, votes: [] }];
  }

  plans[idx] = plan;
  await saveWeeklyPlans(plans);
  return plan;
}

export async function recordVote(planId: string, recipeId: string, voterUserId: string) {
  const plans = await loadWeeklyPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) throw new Error('Weekly plan not found');

  const plan = plans[idx];
  const voted = plan.votedRecipes.find((v) => v.recipeId === recipeId);
  if (!voted) {
    plan.votedRecipes = [...plan.votedRecipes, { recipeId, votes: [voterUserId] }];
  } else if (!voted.votes.includes(voterUserId)) {
    voted.votes = [...voted.votes, voterUserId];
  }

  if (plan.status === 'selecting') {
    plan.status = 'voting';
  }

  plans[idx] = plan;
  await saveWeeklyPlans(plans);
  return plan;
}

export async function scheduleMeal(planId: string, meal: ScheduledMeal) {
  const scheduled = await loadScheduledMeals();
  const forPlan = scheduled[planId] ?? [];

  const updated = forPlan.filter(
    (m) => !(m.date === meal.date && m.mealType === meal.mealType)
  );
  updated.push(meal);

  scheduled[planId] = updated;
  await saveScheduledMeals(scheduled);
  return scheduled[planId];
}

export async function getScheduledMeals(planId: string) {
  const scheduled = await loadScheduledMeals();
  return scheduled[planId] ?? [];
}

export async function getOrCreateCurrentWeekPlan() {
  const household = await getHousehold();
  if (!household) return { household: null as Household | null, plan: null as WeeklyPlan | null };

  const plan = await createWeeklyPlan(household.id, getWeekStartMondayISO());
  return { household, plan };
}

export async function getShareLink(planId: string, cookName?: string) {
  const household = await getHousehold();
  if (!household) throw new Error('No household');
  
  const plan = await getWeeklyPlan(planId);
  if (!plan) throw new Error('Plan not found');
  
  // Encode recipes for web voting
  const recipesData = base64Encode(JSON.stringify(plan.proposedRecipes));
  
  // Build web URL with all params
  // TODO: Update to vote.mealswipe.app when custom domain is configured
  const baseUrl = 'https://vote-iota-beige.vercel.app';
  const params = new URLSearchParams({
    recipes: recipesData,
    from: cookName || 'Your household',
    household: household.name,
  });
  
  return `${baseUrl}/${planId}?${params.toString()}`;
}

// Legacy deep link for app-to-app sharing
export async function getDeepLink(planId: string) {
  const household = await getHousehold();
  if (!household) throw new Error('No household');
  return `mealswipe://vote?planId=${encodeURIComponent(planId)}&code=${encodeURIComponent(household.inviteCode)}`;
}


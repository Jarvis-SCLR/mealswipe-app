# 🍽️ MealSwipe

**Tinder for your taste buds** — Swipe to discover recipes and build your weekly meal plan in seconds.

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

## ✨ Features

- **Swipe to Decide** — Browse recipes with Tinder-style cards. Swipe right to add, left to skip
- **Smart Weekly Menu** — Auto-generates your meal plan from liked recipes
- **Grocery Lists** — One-tap shopping list from your planned meals
- **Dietary Filters** — Vegetarian, vegan, gluten-free, keto, and more
- **Household Scaling** — Adjusts portions for your family size

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native, Expo, TypeScript |
| **Navigation** | Expo Router (file-based) |
| **Animations** | React Native Reanimated, Gesture Handler |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Payments** | RevenueCat |

## 📱 Screenshots

*Coming soon — App Store launch Q2 2026*

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/Jarvis-SCLR/mealswipe-app.git
cd mealswipe-app

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

## 📁 Project Structure

```
├── app/               # Expo Router screens
├── components/        # Reusable UI components
├── contexts/          # React Context providers
├── services/          # API & business logic
├── database/          # Supabase schema & migrations
├── assets/            # Images, fonts, icons
└── constants/         # App-wide constants & config
```

## 🗺️ Roadmap

- [x] Core swipe functionality
- [x] Recipe database integration
- [x] User authentication
- [ ] Grocery list generation
- [ ] Push notification reminders
- [ ] Social sharing
- [ ] App Store release

## 📄 License

MIT © [Niko Pastore](https://github.com/Jarvis-SCLR)

---

<p align="center">
  <i>Built with ☕ in Phoenix, AZ</i>
</p>

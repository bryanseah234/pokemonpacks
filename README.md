# Pokémon Pack Opener

A web-based Pokémon card pack opening simulator with swipe gestures and collection management.

## Description

Pokémon Pack Opener is an interactive web application that simulates the experience of opening Pokémon trading card packs. Users can open virtual packs containing random cards, swipe through them with smooth animations, and build a personal collection of favorite cards. The app integrates with the official Pokémon TCG API to fetch authentic card data and images.

## Features

- Open virtual packs of 8 random Pokémon cards with realistic rarity distribution
- Swipe gestures (left to favorite, right to skip) powered by Hammer.js
- Beautiful GSAP-powered animations for card reveals and transitions
- Collection dashboard to view and manage favorited cards
- Export collection data as CSV
- Dark/Light theme toggle
- Responsive design for mobile, tablet, and desktop
- Session storage caching for offline play

## Technologies Used

- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS with shadcn/ui components
- GSAP (animations)
- Hammer.js (touch gestures)
- TanStack Query (async state management)
- Axios (HTTP client)
- Pokémon TCG API v2

## Installation

```bash
# Clone the repository
git clone https://github.com/bryanseah234/pokemonpacks.git

# Navigate to project directory
cd pokemonpacks

# Install dependencies
npm install
```

## Usage

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### How to Play
1. Click "Open Pack" on the home screen
2. Wait for cards to load from the API
3. Swipe left on cards you want to add to your collection
4. Swipe right to skip to the next card
5. View your collection in the Dashboard

## Demo

Built with [Lovable](https://lovable.dev)

## Disclaimer

1. For educational purposes only
2. Use at your own discretion

## License

MIT License

---

**Author:** [bryanseah234](https://github.com/bryanseah234)

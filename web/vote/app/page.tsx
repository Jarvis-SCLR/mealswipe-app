import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="text-7xl mb-6">🍽️</div>
      <h1 
        className="text-4xl font-bold mb-3"
        style={{ fontFamily: 'Playfair Display', color: 'var(--espresso)' }}
      >
        MealSwipe
      </h1>
      <p className="text-lg opacity-70 mb-8 max-w-sm">
        Vote on your household's weekly meal plan
      </p>
      
      <div className="w-full max-w-sm p-6 rounded-2xl" style={{ backgroundColor: 'var(--foam)' }}>
        <p className="text-sm opacity-60 mb-4">
          Got a voting link from your household cook?
          <br />Paste it in your browser to start voting!
        </p>
        <div className="border-t pt-4" style={{ borderColor: 'rgba(45,36,32,0.1)' }}>
          <p className="text-xs opacity-40">
            Or try the demo:
          </p>
          <Link 
            href="/demo"
            className="inline-block mt-2 px-6 py-2 rounded-xl font-medium text-white"
            style={{ backgroundColor: 'var(--apricot)' }}
          >
            Try Demo
          </Link>
        </div>
      </div>
      
      <p className="text-xs opacity-30 mt-8">
        Part of the MealSwipe app
      </p>
    </div>
  );
}

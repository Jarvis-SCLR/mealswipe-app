import { ExpoRoot } from 'expo-router';

declare const require: {
  context(path: string): any;
};

export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page home-page">
      <h1 className="logo">
        Quizzo<span className="logo-bang">!</span>
      </h1>
      <p className="tagline">Live quiz battles for your crew — Kahoot &amp; Blooket style.</p>
      <div className="home-cards">
        <Link to="/play" className="home-card play">
          <span className="home-card-emoji">🎮</span>
          <h2>Join a game</h2>
          <p>Got a PIN? Jump in and play!</p>
        </Link>
        <Link to="/host" className="home-card host">
          <span className="home-card-emoji">📺</span>
          <h2>Host a game</h2>
          <p>Pick a quiz and put it on the big screen.</p>
        </Link>
        <Link to="/editor" className="home-card create">
          <span className="home-card-emoji">✏️</span>
          <h2>Create a quiz</h2>
          <p>Build your own question sets.</p>
        </Link>
      </div>
    </div>
  );
}

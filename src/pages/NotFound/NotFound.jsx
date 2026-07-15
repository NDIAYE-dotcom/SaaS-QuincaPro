import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Cette page n'existe pas.</p>
      <Link to="/" className="not-found__link">
        Retour au tableau de bord
      </Link>
    </div>
  );
}

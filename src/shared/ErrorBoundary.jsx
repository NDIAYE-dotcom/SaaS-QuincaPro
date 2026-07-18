import { Component } from 'react';
import { LuTriangleAlert, LuRefreshCw } from 'react-icons/lu';
import './ui.css';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Erreur non interceptée :', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="blocked-screen">
          <div className="blocked-screen__icon">
            <LuTriangleAlert />
          </div>
          <h1>Une erreur est survenue</h1>
          <p>Quelque chose s'est mal passé. Rechargez la page pour continuer.</p>
          <button className="blocked-screen__signout" onClick={this.handleReload}>
            <LuRefreshCw /> Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

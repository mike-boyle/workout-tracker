import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearLocalState } from '../services/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = async () => {
    if (
      confirm(
        'Are you sure you want to reset the database? This will clear all your local workout progress and settings. If you have synced with Firebase, your cloud data will remain, but you will need to sign in again to sync.'
      )
    ) {
      try {
        await clearLocalState();
        window.location.hash = '#/dashboard';
        window.location.reload();
      } catch (err) {
        console.error('Failed to clear database:', err);
        alert('Failed to clear database. Please clear your browser cache/storage manually.');
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'rgba(235, 87, 87, 0.15)',
                border: '1px solid rgba(235, 87, 87, 0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                color: 'var(--color-red)',
                fontSize: '2rem',
                fontWeight: 'bold',
              }}
            >
              ⚠
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                marginBottom: '12px',
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Something Went Wrong
            </h1>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '1rem',
                lineHeight: '1.5',
                marginBottom: '24px',
              }}
            >
              The application encountered an unexpected state. This is typically caused by data
              inconsistency or environment issues.
            </p>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '32px',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Error Details
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: '#eb5757',
                }}
              >
                {this.state.error?.message || String(this.state.error)}
              </pre>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
                style={{ minWidth: '150px' }}
              >
                Reload Page
              </button>
              <button
                className="btn btn-danger"
                onClick={this.handleReset}
                style={{ minWidth: '150px' }}
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

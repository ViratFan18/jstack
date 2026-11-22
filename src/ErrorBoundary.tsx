import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <main className="app-crash" role="alert">
        <h1>JStack could not render this view.</h1>
        <p>Your current inputs may only exist in this tab. Copy anything you need before reloading.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        <a href="/">Return to the JStack homepage</a>
      </main>
    }
    return this.props.children
  }
}

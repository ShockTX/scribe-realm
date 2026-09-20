import { Component, type ReactNode } from "react";

/**
 * A blank page is the worst possible error message. If anything throws, say so
 * and offer the one action that always works: start again.
 */
export class Boundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="title">
        <h1>Something tore</h1>
        <p>The page could not be drawn. Your saved character may be from an older version.</p>
        <p className="ware__note">{error.message}</p>
        <div className="title__acts">
          <button
            className="bind"
            onClick={() => {
              this.props.onReset();
              this.setState({ error: null });
            }}
          >
            Start a new character
          </button>
        </div>
      </div>
    );
  }
}

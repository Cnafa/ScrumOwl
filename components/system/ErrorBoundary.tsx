import React from "react";
import { logCrash } from "../../libs/logging/crashLogger";

// FIX: Correctly typed the component's props using `React.PropsWithChildren<{}>`.
// The generic type `PropsWithChildren` requires a type argument. Using `{}` for components that only have children props.
export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean }> {
  // FIX: Re-instated the constructor to explicitly call `super(props)`. This ensures `this.props` is correctly initialized on the component instance, resolving the "Property 'props' does not exist" error.
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: any, info: { componentStack: string }) {
    try { (window as any).__lastReactComponentStack = info?.componentStack; } catch {}
    logCrash(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 border-2 border-red-500 bg-red-50 m-4 rounded-lg text-center">
          <h2 className="font-bold text-red-800 text-lg">Something went wrong.</h2>
          <p className="text-red-700 my-2">An unexpected error occurred. Please try reloading the page.</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

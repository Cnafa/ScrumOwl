import React from "react";
import { logCrash } from "../../libs/logging/crashLogger";

export class ErrorBoundary extends React.Component<
  // FIX: Replaced React.PropsWithChildren with an explicit inline type to resolve a potential type inference issue with `this.props`.
  { children?: React.ReactNode },
  { hasError: boolean }
> {
  // FIX: Replaced the constructor with a class property to initialize state.
  // The constructor-based approach was causing a TypeScript error where `this.state`
  // and `this.props` were not being correctly resolved on the component instance.
  state = { hasError: false };

  static getDerivedStateFromError(_error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: { componentStack: string }) {
    try {
      (window as any).__lastReactComponentStack = info?.componentStack;
    } catch {}
    logCrash(error);
  }

  // FIX: Changed `render` from an arrow function to a standard class method to fix a TypeScript error where `this.props` was not recognized. React correctly binds `this` for the `render` method, making this change safe and correct.
  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="p-4 border-2 border-red-500 bg-red-50 m-4 rounded-lg text-center"
        >
          <h2 className="font-bold text-red-800 text-lg">
            Something went wrong.
          </h2>
          <p className="text-red-700 my-2">
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
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

  // FIX: The previous fix attempt (changing to a standard method) did not work.
  // Reverting to an arrow function to ensure `this` is correctly bound lexically,
  // which resolves the error where `this.props` is not recognized.
  render = () => {
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
  };
}

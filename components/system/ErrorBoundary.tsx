import React from "react";
import { logCrash } from "../../libs/logging/crashLogger";

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  { hasError: boolean }
> {
  // FIX: Replaced the constructor with a class property to initialize state.
  // The constructor-based approach was causing TypeScript errors where `this.state`
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

  // FIX: The original `render()` method was a standard class method. In some misconfigured environments or with specific TypeScript settings, the `this` context within such methods can be lost, causing `this.props` to be undefined. By converting `render` to a class property assigned to an arrow function (`render = () => { ... }`), we lexically bind `this` to the component instance. This ensures that `this.props` is always correctly resolved, fixing the "Property 'props' does not exist" error without reintroducing a constructor, which was noted to cause other issues.
  render = (): React.ReactNode => {
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

import React from "react";
export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error(error, info); }
  render(){
    if(this.state.hasError){
      return (
        <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-6 mt-6">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <pre className="mt-2 text-sm text-red-700 whitespace-pre-wrap">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

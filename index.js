import {AppRegistry, LogBox} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

// Ignore specific warnings during development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Log any unhandled errors
const ErrorFallback = () => {
  const React = require('react');
  const {View, Text} = require('react-native');
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'}}>
      <Text style={{fontSize: 18, color: '#000'}}>An error occurred loading the app</Text>
      <Text style={{fontSize: 14, color: '#666', marginTop: 8}}>Check the console for details</Text>
    </View>
  );
};

class ErrorBoundary extends require('react').Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

const AppWithErrorBoundary = () => {
  const React = require('react');
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

AppRegistry.registerComponent(appName, () => AppWithErrorBoundary);

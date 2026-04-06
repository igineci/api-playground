import { RequestProvider } from './context/RequestContext';
import ApiPlayground from './components/ApiPlayground';

function App() {

  return (
    <RequestProvider>
      <ApiPlayground />
    </RequestProvider>
  );
}

export default App

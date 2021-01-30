import logo from './logo.svg';
import './App.css';
import Navbar_Main from './components/Navbar.jsx';

import DataGrid from 'react-data-grid';
import 'react-data-grid/dist/react-data-grid.css';

const columns = [
  { key: 'id', name: 'ID' },
  { key: 'title', name: 'Title' },
];

const rows = [
  { id: 0, title: 'Example' },
  { id: 1, title: 'Demo' },
];

function App() {
  return (
    <div className="App">
      <Navbar_Main />
      <DataGrid columns={columns} rows={rows} />
    </div>
  );
}

export default App;

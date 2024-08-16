
import React from 'react'
import { BrowserRouter as Router ,Route,Routes} from 'react-router-dom'
import Signin from './pages/Signin'
import Signup from './pages/Signup'


const App = () => {
  return (
    <>
    
    <Router>
      <Routes>
        <Route path='/signin' element={<Signin/>}/>
        <Route path='/signup' element={<Signup/>}/>
      </Routes>
    </Router>
    </>
  )
}

export default App

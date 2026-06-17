import React, { useEffect, useState } from 'react'
import { /* Link, */ useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,/* 
  CInputGroupText, */
  CRow,
} from '@coreui/react'/* 
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons' */
import { login } from '../../../services/auth.service'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      setError('')
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas')
    }
  }

  useEffect(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.clear()

    setEmail('')
    setPassword('')
  }, [])

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>Terminal Logistico</h1>
                    <p className="text-body-secondary">Ingresa tus credenciales</p>

                    {error && <p className="text-danger">{error}</p>}

                    <CInputGroup className="mb-3">
                      <CFormInput
                        placeholder="Email"
                        autoComplete="new-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </CInputGroup>

                    <CButton color="primary" type="submit" className="px-4">
                      Entrar
                    </CButton>
                  </CForm>
                </CCardBody>
              </CCard>
              {/*  <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>Sign up</h2>
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
                      tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <Link to="/register">
                      <CButton color="primary" className="mt-3" active tabIndex={-1}>
                        Register Now!
                      </CButton>
                    </Link>
                  </div>
                </CCardBody>
              </CCard> */}
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login

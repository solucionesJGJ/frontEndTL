import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import {
  createUser,
  deactivateUser,
  getUsers,
  updateUser,
  type User,
  type UserPayload,
} from '../../../services/user.service'
import { getRoles, type Role } from '../../../services/role.service'
import { getClients, type Client } from '../../../services/client.service'
import { useFeedback } from '../../../context/FeedbackContext'

const emptyForm = {
  name: '',
  rut: '',
  email: '',
  password: '',
  role_id: '',
  client_id: '',
  active: true,
}

function normalizeRut(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^0-9K.-]/g, '')
    .slice(0, 12)
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { confirmAction, showAlert, showBackendError } = useFeedback()

  const selectedRole = useMemo(() => {
    return roles.find((role) => role.id === form.role_id)
  }, [roles, form.role_id])

  const isClientRole = selectedRole?.name === 'client_operator'

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [usersData, rolesData, clientsData] = await Promise.all([
        getUsers(),
        getRoles(),
        getClients(),
      ])

      setUsers(usersData)
      setRoles(rolesData)
      setClients(clientsData.filter((client) => client.active))
    } catch (error) {
      showBackendError(error, 'Error cargando usuarios')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof emptyForm, value: string | boolean) => {
    if (field === 'rut' && typeof value === 'string') {
      setForm((prev) => ({
        ...prev,
        rut: normalizeRut(value),
      }))

      return
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'role_id' ? { client_id: '' } : {}),
    }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showAlert('El nombre es obligatorio', 'warning')

      return
    }

    if (!form.rut.trim()) {
      showAlert('El RUT es obligatorio', 'warning')

      return
    }

    if (!form.email.trim()) {
      showAlert('El email es obligatorio', 'warning')

      return
    }

    if (!form.role_id) {
      showAlert('El rol es obligatorio', 'warning')

      return
    }

    if (!editingId && !form.password.trim()) {
      showAlert('La contraseña es obligatoria para crear usuario', 'warning')

      return
    }

    if (isClientRole && !form.client_id) {
      showAlert('Los usuarios cliente deben tener un cliente asociado', 'warning')

      return
    }

    const duplicateRut = users.find(
      (user) =>
        user.rut?.replace(/[.-]/g, '').toUpperCase() ===
        form.rut.replace(/[.-]/g, '').toUpperCase() && user.id !== editingId,
    )

    if (duplicateRut) {
      showAlert(`El RUT ${form.rut} ya pertenece a ${duplicateRut.name}`, 'warning')

      return
    }

    const duplicateEmail = users.find(
      (user) =>
        user.email.trim().toLowerCase() === form.email.trim().toLowerCase() &&
        user.id !== editingId,
    )

    if (duplicateEmail) {
      showAlert(`El email ${form.email} ya pertenece a otro usuario`, 'warning')

      return
    }

    const confirmed = await confirmAction({
      title: editingId ? 'Actualizar usuario' : 'Crear usuario',
      message: 'Se guardarán los siguientes datos:',
      confirmText: editingId ? 'Actualizar' : 'Crear',
      color: 'primary',
      fields: [
        {
          label: 'Nombre',
          value: form.name,
        },
        {
          label: 'RUT',
          value: form.rut,
        },
        {
          label: 'Email',
          value: form.email,
        },
        {
          label: 'Rol',
          value: selectedRole?.nameDisplay || selectedRole?.name || '-',
        },
        {
          label: 'Cliente',
          value: isClientRole
            ? clients.find((client) => client.id === form.client_id)?.name || '-'
            : 'No aplica',
        },
        {
          label: 'Activo',
          value: form.active ? 'Sí' : 'No',
        },
      ],
    })

    if (!confirmed.confirmed) {
      return
    }

    const payload: UserPayload = {
      name: form.name.trim(),
      rut: form.rut.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim() || undefined,
      role_id: form.role_id,
      client_id: isClientRole ? form.client_id : null,
      active: form.active,
    }

    try {
      if (editingId) {
        await updateUser(editingId, payload)

        showAlert('Usuario actualizado correctamente', 'success')
      } else {
        await createUser(payload)

        showAlert('Usuario creado correctamente', 'success')
      }

      setForm(emptyForm)
      setEditingId(null)

      await loadData()
    } catch (error) {
      showBackendError(error, 'Error guardando usuario')
    }
  }

  const handleEdit = (user: User) => {
    setEditingId(user.id)

    setForm({
      name: user.name || '',
      rut: user.rut || '',
      email: user.email || '',
      password: '',
      role_id: user.role_id || '',
      client_id: user.client_id || '',
      active: user.active,
    })
  }

  const handleDeactivate = async (id: string) => {
    const user = users.find((currentUser) => currentUser.id === id)

    if (!user) {
      showAlert('Usuario no encontrado', 'danger')

      return
    }

    const confirmed = await confirmAction({
      title: 'Desactivar usuario',
      message: '¿Seguro que deseas desactivar este usuario?',
      confirmText: 'Desactivar',
      color: 'danger',
      fields: [
        {
          label: 'Nombre',
          value: user.name,
        },
        {
          label: 'RUT',
          value: user.rut,
        },
        {
          label: 'Email',
          value: user.email,
        },
        {
          label: 'Rol',
          value: user.role?.name_display || '-',
        },
      ],
    })

    if (!confirmed.confirmed) {
      return
    }

    try {
      await deactivateUser(id)

      showAlert('Usuario desactivado correctamente', 'success')

      await loadData()
    } catch (error) {
      showBackendError(error, 'Error desactivando usuario')
    }
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditingId(null)

    showAlert('Edición cancelada', 'success')
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <CCard>
      <CCardHeader>
        <strong>Usuarios</strong>
      </CCardHeader>

      <CCardBody>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormInput
              label="Nombre"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </CCol>

          <CCol md={2}>
            <CFormInput
              label="RUT"
              value={form.rut}
              placeholder="12.345.678-9"
              onChange={(e) => handleChange('rut', e.target.value)}
            />
          </CCol>

          <CCol md={3}>
            <CFormInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              autoComplete="new-email"
            />
          </CCol>

          <CCol md={2}>
            <CFormInput
              label={editingId ? 'Nueva contraseña opcional' : 'Contraseña'}
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              autoComplete="new-password"
            />
          </CCol>

          <CCol md={2}>
            <CFormSelect
              label="Rol"
              value={form.role_id}
              onChange={(e) => handleChange('role_id', e.target.value)}
            >
              <option value="">Seleccione rol</option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nameDisplay.toUpperCase()}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-4">
          <CCol md={5}>
            <CFormSelect
              label="Cliente asociado"
              value={form.client_id}
              disabled={!isClientRole}
              onChange={(e) => handleChange('client_id', e.target.value)}
            >
              <option value="">{isClientRole ? 'Seleccione cliente' : 'No aplica'}</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.rut ? `(${client.rut})` : ''}
                </option>
              ))}
            </CFormSelect>
          </CCol>

          <CCol md={2} className="d-flex align-items-end">
            <CFormCheck
              label="Activo"
              checked={form.active}
              onChange={(e) => handleChange('active', e.target.checked)}
            />
          </CCol>

          <CCol md={5} className="d-flex align-items-end justify-content-end gap-2">
            <CButton color="primary" disabled={isLoading} onClick={handleSubmit}>
              {editingId ? 'Actualizar' : 'Crear'}
            </CButton>

            {editingId && (
              <CButton color="secondary" onClick={handleCancel}>
                Cancelar
              </CButton>
            )}
          </CCol>
        </CRow>

        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Nombre</CTableHeaderCell>
              <CTableHeaderCell>RUT</CTableHeaderCell>
              <CTableHeaderCell>Email</CTableHeaderCell>
              <CTableHeaderCell>Rol</CTableHeaderCell>
              <CTableHeaderCell>Cliente</CTableHeaderCell>
              <CTableHeaderCell>Activo</CTableHeaderCell>
              <CTableHeaderCell>Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>

          <CTableBody>
            {users.map((user) => (
              <CTableRow key={user.id}>
                <CTableDataCell>{user.name}</CTableDataCell>
                <CTableDataCell>{user.rut || '-'}</CTableDataCell>
                <CTableDataCell>{user.email}</CTableDataCell>
                <CTableDataCell>{user.role?.name_display || '-'}</CTableDataCell>
                <CTableDataCell>{user.client?.name || '-'}</CTableDataCell>
                <CTableDataCell>{user.active ? 'Sí' : 'No'}</CTableDataCell>

                <CTableDataCell>
                  <div className="d-flex gap-2">
                    <CButton color="warning" size="sm" onClick={() => handleEdit(user)}>
                      Editar
                    </CButton>

                    {user.active && (
                      <CButton
                        color="secondary"
                        size="sm"
                        onClick={() => handleDeactivate(user.id)}
                      >
                        Desactivar
                      </CButton>
                    )}
                  </div>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default Users
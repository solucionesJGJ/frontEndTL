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
} from '../../../services/user.service'

import { getRoles, type Role } from '../../../services/role.service'
import { getClients, type Client } from '../../../services/client.service'

const emptyForm = {
    name: '',
    email: '',
    password: '',
    role_id: '',
    client_id: '',
    active: true,
}

const Users = () => {
    const [users, setUsers] = useState<User[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false);

    const selectedRole = useMemo(() => {
        return roles.find((role) => role.id === form.role_id)
    }, [roles, form.role_id])

    const isClientRole = selectedRole?.name === 'client_operator'

    const loadData = async () => {
        const [usersData, rolesData, clientsData] = await Promise.all([
            getUsers(),
            getRoles(),
            getClients(),
        ])

        setUsers(usersData)
        setRoles(rolesData)
        setClients(clientsData.filter((client) => client.active))

    }

    const handleChange = (
        field: keyof typeof emptyForm,
        value: string | boolean,
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === 'role_id' ? { client_id: '' } : {}),
        }))
    }

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.role_id) {
            alert('Nombre, email y rol son obligatorios')
            return
        }

        if (!editingId && !form.password.trim()) {
            alert('La contraseña es obligatoria para crear usuario')
            return
        }

        if (isClientRole && !form.client_id) {
            alert('Los usuarios cliente deben tener cliente asociado')
            return
        }

        const payload = {
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            role_id: form.role_id,
            client_id: isClientRole ? form.client_id : null,
            active: form.active,
        }

        if (editingId) {
            await updateUser(editingId, payload)
        } else {
            await createUser(payload)
        }

        setForm(emptyForm)
        setEditingId(null)
        await loadData()
    }

    const handleEdit = (user: User) => {
        setEditingId(user.id)

        setForm({
            name: user.name,
            email: user.email,
            password: '',
            role_id: user.role_id,
            client_id: user.client_id || '',
            active: user.active,
        })
    }

    const handleDeactivate = async (id: string) => {
        const confirmDeactivate = window.confirm('¿Desactivar usuario?')

        if (!confirmDeactivate) return

        await deactivateUser(id)
        await loadData()
    }

    const handleCancel = () => {
        setForm(emptyForm)
        setEditingId(null)
    }

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            await loadData()
            setForm(emptyForm)
            setEditingId(null)
            setIsLoading(false)
        }
        if (!isLoading) {
            load();
        }

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

                    <CCol md={3}>
                        <CFormInput
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            autoComplete="new-email"

                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label={editingId ? 'Nueva contraseña opcional' : 'Contraseña'}
                            type="password"
                            value={form.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            autoComplete="new-password"
                        />
                    </CCol>

                    <CCol md={3}>
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
                    <CCol md={4}>
                        <CFormSelect
                            label="Cliente asociado"
                            value={form.client_id}
                            disabled={!isClientRole}
                            onChange={(e) => handleChange('client_id', e.target.value)}
                        >
                            <option value="">
                                {isClientRole ? 'Seleccione cliente' : 'No aplica'}
                            </option>
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

                    <CCol md={6} className="d-flex align-items-end gap-2">
                        <CButton color="primary" onClick={handleSubmit}>
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
                                <CTableDataCell>{user.email}</CTableDataCell>
                                <CTableDataCell>{user.role?.name_display || '-'}</CTableDataCell>
                                <CTableDataCell>{user.client?.name || '-'}</CTableDataCell>
                                <CTableDataCell>{user.active ? 'Sí' : 'No'}</CTableDataCell>
                                <CTableDataCell>
                                    <div className="d-flex gap-2">
                                        <CButton
                                            color="warning"
                                            size="sm"
                                            onClick={() => handleEdit(user)}
                                        >
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
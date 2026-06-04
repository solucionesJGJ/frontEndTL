import React, { useEffect, useState } from 'react'
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CFormInput,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import {
    getClients,
    createClient,
    updateClient,
    deleteClient,
    type Client,
} from '../../../services/client.service'

const emptyForm = {
    name: '',
    rut: '',
    address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
}

const Clients = () => {
    const [clients, setClients] = useState<Client[]>([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false);

    const loadClients = async () => {
        setIsLoading(true);
        const data = await getClients()
        setClients(data)
        setIsLoading(false);
    }

    const handleChange = (field: keyof typeof emptyForm, value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            alert('El nombre es obligatorio')
            return
        }

        if (editingId) {
            console.log('Updating client', editingId, form)
            await updateClient(editingId, form)
        } else {
            await createClient(form)
        }

        setForm(emptyForm)
        setEditingId(null)
        await loadClients()
    }

    const handleEdit = async (client: Client) => {
        setEditingId(client.id)
        setForm({
            name: client.name || '',
            rut: client.rut || '',
            address: client.address || '',
            contact_name: client.contact_name || '',
            contact_email: client.contact_email || '',
            contact_phone: client.contact_phone || '',
        })
    }

    const handleDelete = async (id: string) => {
        const confirmDelete = window.confirm('¿Eliminar cliente?')

        if (!confirmDelete) return

        await deleteClient(id)
        await loadClients()
    }

    const handleCancel = () => {
        setForm(emptyForm)
        setEditingId(null)
    }

    useEffect(() => {
        const load = async () => {
            if (!isLoading) {
                await loadClients()
            }
        }
        load()
    }, [])

    return (
        <CCard>
            <CCardHeader>
                <strong>Clientes</strong>
            </CCardHeader>

            <CCardBody>
                <CRow className="mb-3">
                    <CCol md={4}>
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
                            onChange={(e) => handleChange('rut', e.target.value)}
                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label="Contacto"
                            value={form.contact_name}
                            onChange={(e) => handleChange('contact_name', e.target.value)}
                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label="Email"
                            value={form.contact_email}
                            onChange={(e) => handleChange('contact_email', e.target.value)}
                        />
                    </CCol>
                </CRow>

                <CRow className="mb-4">
                    <CCol md={5}>
                        <CFormInput
                            label="Dirección"
                            value={form.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label="Teléfono"
                            value={form.contact_phone}
                            onChange={(e) => handleChange('contact_phone', e.target.value)}
                        />
                    </CCol>

                    <CCol md={4} className="d-flex align-items-end gap-2">
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
                            <CTableHeaderCell>RUT</CTableHeaderCell>
                            <CTableHeaderCell>Contacto</CTableHeaderCell>
                            <CTableHeaderCell>Email</CTableHeaderCell>
                            <CTableHeaderCell>Teléfono</CTableHeaderCell>
                            <CTableHeaderCell>Activo</CTableHeaderCell>
                            <CTableHeaderCell>Acciones</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>

                    <CTableBody>
                        {clients.map((client) => (
                            <CTableRow key={client.id}>
                                <CTableDataCell>{client.name}</CTableDataCell>
                                <CTableDataCell>{client.rut}</CTableDataCell>
                                <CTableDataCell>{client.contact_name}</CTableDataCell>
                                <CTableDataCell>{client.contact_email}</CTableDataCell>
                                <CTableDataCell>{client.contact_phone}</CTableDataCell>
                                <CTableDataCell>{client.active ? 'Sí' : 'No'}</CTableDataCell>
                                <CTableDataCell>
                                    <div className="d-flex gap-2">
                                        <CButton
                                            color="warning"
                                            size="sm"
                                            onClick={() => handleEdit(client)}
                                        >
                                            Editar
                                        </CButton>

                                        <CButton
                                            color="danger"
                                            size="sm"
                                            onClick={() => handleDelete(client.id)}
                                        >
                                            Eliminar
                                        </CButton>
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

export default Clients
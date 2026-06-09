import React, { useEffect, useState } from 'react'
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CFormInput,
    CFormSelect,
    CFormTextarea,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import { useNavigate } from 'react-router-dom'

import {
    createOperatorBatch,
    getOperatorBatches,
    type OperatorBatch,
} from '../../../services/operatorBatch.service'

import { getClients, type Client } from '../../../services/client.service'
import {
    getCurrentUser,
    isClientOperator,
    isAdmin,
} from '../../../services/auth.service'

const emptyForm = {
    client_id: '',
    batch_number: '',
    origin_location: '',
    destination_location: '',
    notes: '',
}

const OperatorBatches = () => {
    const [batches, setBatches] = useState<OperatorBatch[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [form, setForm] = useState(emptyForm)
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate();
    const currentUser = getCurrentUser()
    const clientOperator = isClientOperator()
    const adminUser = isAdmin()

    const loadData = async () => {
        const [batchesData, clientsData] = await Promise.all([
            getOperatorBatches(),
            getClients(),
        ])

        setBatches(batchesData)

        if (clientOperator && currentUser?.client) {
            setClients([currentUser.client])

            setForm((prev) => ({
                ...prev,
                client_id: currentUser.client.id,
            }))
        } else {
            setClients(clientsData.filter((client) => client.active))
        }
    }

    const handleChange = (
        field: keyof typeof emptyForm,
        value: string,
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async () => {
        if (!form.batch_number.trim()) {
            alert('Número de lote es obligatorio')
            return
        }

        if (adminUser && !form.client_id) {
            alert('Cliente es obligatorio')
            return
        }

        if (clientOperator && !currentUser?.client?.id) {
            alert('Tu usuario no tiene cliente asociado')
            return
        }

        try {
            setLoading(true)

            await createOperatorBatch({
                client_id: clientOperator
                    ? currentUser.client.id
                    : form.client_id,
                batch_number: form.batch_number,
                origin_location: form.origin_location,
                destination_location: form.destination_location,
                notes: form.notes,
            })

            setForm({
                ...emptyForm,
                client_id: clientOperator ? currentUser.client.id : '',
            })

            await loadData()
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Error creando lote')
        } finally {
            setLoading(false)
        }
    }
    const user = getCurrentUser()
    const role = user?.role?.name
    const isClientOperatorUser = role === 'client_operator'
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await loadData();
            if (isClientOperatorUser && user?.client?.id) {
                setForm((prev) => ({
                    ...prev,
                    client_id: user.client.id,
                }))
            }
            setLoading(false);
        }
        if (!loading) {
            load();
        }
    }, [])

    return (
        <CCard>
            <CCardHeader>
                <strong>Recepción de lotes</strong>
            </CCardHeader>

            <CCardBody>
                {(adminUser || isClientOperatorUser )&& (
                    <><CRow className="mb-3">
                        <CCol md={4}>
                            <CFormSelect
                                label="Cliente"
                                value={form.client_id}
                                disabled={clientOperator}
                                onChange={(e) => handleChange('client_id', e.target.value)}
                            >
                                <option value="">Seleccione cliente</option>

                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} {client.rut ? `(${client.rut})` : ''}
                                    </option>
                                ))}
                            </CFormSelect>
                        </CCol>

                        <CCol md={3}>
                            <CFormInput
                                label="Número de lote"
                                value={form.batch_number}
                                onChange={(e) =>
                                    handleChange('batch_number', e.target.value)
                                }
                                placeholder="Ej: LOTE-0001"
                            />
                        </CCol>

                        <CCol md={3}>
                            <CFormInput
                                label="Origen"
                                value={form.origin_location}
                                onChange={(e) =>
                                    handleChange('origin_location', e.target.value)
                                }
                                placeholder="Ej: Cliente"
                            />
                        </CCol>

                        <CCol md={2}>
                            <CFormInput
                                label="Destino"
                                value={form.destination_location}
                                onChange={(e) =>
                                    handleChange('destination_location', e.target.value)
                                }
                                placeholder="Ej: Planta"
                            />
                        </CCol>
                    </CRow>

                        <CRow className="mb-4">
                            <CCol md={8}>
                                <CFormTextarea
                                    label="Notas"
                                    rows={1}
                                    value={form.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                />
                            </CCol>

                            <CCol md={4} className="d-flex align-items-end">
                                <CButton
                                    color="primary"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? 'Guardando...' : 'Crear lote'}
                                </CButton>
                            </CCol>
                        </CRow></>
                )}
                <CTable hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell>N° Lote</CTableHeaderCell>
                            <CTableHeaderCell>Cliente</CTableHeaderCell>
                            <CTableHeaderCell>Origen</CTableHeaderCell>
                            <CTableHeaderCell>Destino</CTableHeaderCell>
                            <CTableHeaderCell>Estado</CTableHeaderCell>
                            <CTableHeaderCell>Creado por</CTableHeaderCell>
                            <CTableHeaderCell>Recepción</CTableHeaderCell>
                            <CTableHeaderCell>Acciones</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>

                    <CTableBody>
                        {batches.map((batch) => (
                            <CTableRow key={batch.id}>
                                <CTableDataCell>{batch.batch_number}</CTableDataCell>
                                <CTableDataCell>{batch.client?.name || '-'}</CTableDataCell>
                                <CTableDataCell>{batch.origin_location || '-'}</CTableDataCell>
                                <CTableDataCell>{batch.destination_location || '-'}</CTableDataCell>
                                <CTableDataCell>
                                    {batch.current_status?.name || '-'}
                                </CTableDataCell>
                                <CTableDataCell>
                                    {batch.creator?.name || '-'}
                                </CTableDataCell>
                                <CTableDataCell>
                                    {batch.received_at
                                        ? new Date(batch.received_at).toLocaleString()
                                        : '-'}
                                </CTableDataCell>
                                <CTableDataCell>
                                    <CButton
                                        color="primary"
                                        size="sm"
                                        onClick={() => navigate(`/operator/batches/${batch.id}`)}
                                    >
                                        Ver detalle
                                    </CButton>
                                </CTableDataCell>
                            </CTableRow>
                        ))}
                    </CTableBody>
                </CTable>
            </CCardBody>
        </CCard>
    )
}

export default OperatorBatches
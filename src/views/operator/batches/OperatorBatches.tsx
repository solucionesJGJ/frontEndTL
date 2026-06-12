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
    evaluateOperatorBatch,
    changeOperatorBatchStatus
} from '../../../services/operatorBatch.service'

import { getClients, type Client } from '../../../services/client.service'
import {
    getCurrentUser,
    isClientOperator,
    isAdmin,
} from '../../../services/auth.service'

import { receiveOperatorBatch } from '../../../services/operatorBatch.service'
import { getCurrentRole } from '../../../services/auth.service'
import { useFeedback } from '../../../context/FeedbackContext'

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
    const role = getCurrentRole()
    const canCreateBatch = role === 'admin' || role === 'client_operator'
    const canOperatePlant = role === 'admin' || role === 'warehouse_operator'
    const { confirmAction, showAlert, showBackendError } = useFeedback()

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

    const getAvailableActions = (statusCode?: string) => {
        switch (statusCode) {
            case 'EN_PROCESO':
                return [
                    { label: 'Enviar a reproceso', code: 'REPROCESO', color: 'warning' },
                    { label: 'Preparar despacho', code: 'PREPARADO_DESPACHO', color: 'primary' },
                ]

            case 'REPROCESO':
                return [
                    { label: 'Volver a proceso', code: 'EN_PROCESO', color: 'primary' },
                    { label: 'Preparar despacho', code: 'PREPARADO_DESPACHO', color: 'primary' },
                ]

            case 'DERIVADO_EXTERNO':
                return [
                    { label: 'Enviar a traslado', code: 'EN_TRASLADO', color: 'primary' },
                ]

            case 'PREPARADO_DESPACHO':
                return [
                    { label: 'Enviar a traslado', code: 'EN_TRASLADO', color: 'primary' },
                ]

            case 'EN_TRASLADO':
                return [
                    { label: 'Retornar cliente', code: 'RETORNADO_CLIENTE', color: 'success' },
                ]

            case 'RETORNADO_CLIENTE':
                return [
                    { label: 'Cerrar lote', code: 'CERRADO', color: 'dark' },
                ]

            default:
                return []
        }
    }

    const handleChangeStatus = async (
        batch: OperatorBatch,
        nextStatusCode: string,
        label: string,
    ) => {
        const confirmed = await confirmAction({
            title: label,
            message: '¿Confirmas cambiar el estado del lote?',
            confirmText: 'Confirmar',
            color: nextStatusCode === 'CERRADO' ? 'danger' : 'primary',
            fields: [
                { label: 'Lote', value: batch.batch_number },
                { label: 'Cliente', value: batch.client?.name },
                { label: 'Estado actual', value: batch.current_status?.name },
                { label: 'Nuevo estado', value: nextStatusCode },
            ],
        })

        if (!confirmed) return

        try {
            await changeOperatorBatchStatus(batch.id, nextStatusCode)
            showAlert('Estado actualizado correctamente', 'success')
            await loadData()
        } catch (error) {
            showBackendError(error, 'Error cambiando estado')
        }
    }

    const handleReceive = async (batch: OperatorBatch) => {
        const confirmed = await confirmAction({
            title: 'Recepcionar lote',
            message: '¿Confirmas la recepción de este lote en planta?',
            confirmText: 'Recepcionar',
            color: 'primary',
            fields: [
                { label: 'Lote', value: batch.batch_number },
                { label: 'Cliente', value: batch.client?.name },
                { label: 'Estado actual', value: batch.current_status?.name },
            ],
        })

        if (!confirmed) return

        try {
            await receiveOperatorBatch(batch.id)
            showAlert('Lote recepcionado correctamente', 'success')
            await loadData()
        } catch (error) {
            showBackendError(error, 'Error recepcionando lote')
        }
    }

    const handleEvaluate = async (
        batch: OperatorBatch,
        canProcess: boolean,
    ) => {
        const confirmed = await confirmAction({
            title: canProcess ? 'Enviar a proceso' : 'Derivar externo',
            message: canProcess
                ? '¿Confirmas que este lote puede procesarse en planta?'
                : '¿Confirmas que este lote debe derivarse externamente?',
            confirmText: canProcess ? 'Procesar' : 'Derivar',
            color: canProcess ? 'primary' : 'warning',
            fields: [
                { label: 'Lote', value: batch.batch_number },
                { label: 'Cliente', value: batch.client?.name },
                { label: 'Estado actual', value: batch.current_status?.name },
                {
                    label: 'Nuevo estado',
                    value: canProcess ? 'En Proceso' : 'Derivado Externo',
                },
            ],
        })

        if (!confirmed) return

        try {
            await evaluateOperatorBatch(batch.id, canProcess)
            showAlert(
                canProcess
                    ? 'Lote enviado a proceso correctamente'
                    : 'Lote derivado externamente correctamente',
                'success',
            )
            await loadData()
        } catch (error) {
            showBackendError(error, 'Error evaluando lote')
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
                <strong>Creacion de lotes</strong>
            </CCardHeader>

            <CCardBody>
                {(adminUser || isClientOperatorUser) && (
                    <>
                    <CRow className="mb-3">
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
                                    <div className="d-flex gap-2">
                                        <CButton
                                            color="primary"
                                            size="sm"
                                            onClick={() => navigate(`/operator/batches/${batch.id}`)}
                                        >
                                            Ver detalle
                                        </CButton>
                                        {canOperatePlant && batch.current_status?.code === 'PENDIENTE_RECEPCION' && (
                                            <CButton
                                                color="success"
                                                size="sm"
                                                onClick={() => handleReceive(batch)}
                                            >
                                                Recepcionar
                                            </CButton>
                                        )}
                                        {canOperatePlant && batch.current_status?.code === 'RECEPCIONADO' && (
                                            <>
                                                <CButton
                                                    color="primary"
                                                    size="sm"
                                                    onClick={() => handleEvaluate(batch, true)}
                                                >
                                                    Procesar
                                                </CButton>

                                                <CButton
                                                    color="warning"
                                                    size="sm"
                                                    onClick={() => handleEvaluate(batch, false)}
                                                >
                                                    Derivar
                                                </CButton>
                                            </>
                                        )}
                                        {canOperatePlant &&
                                            getAvailableActions(batch.current_status?.code).map((action) => (
                                                <CButton
                                                    key={action.code}
                                                    color={action.color as any}
                                                    size="sm"
                                                    onClick={() =>
                                                        handleChangeStatus(batch, action.code, action.label)
                                                    }
                                                >
                                                    {action.label}
                                                </CButton>
                                            ))}
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

export default OperatorBatches
import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    CAlert,
    CBadge,
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

import {
    getOperatorBatchById,
    dispatchClientBatch,
    type OperatorBatch,
} from '../../../services/operatorBatch.service'

import {
    addBatchItem,
    getBatchItems,
    removeBatchItem,
    updateBatchItem,
    type OperatorBatchItem,
} from '../../../services/operatorBatchItem.service'

import { getGarments, type Garment } from '../../../services/garment.service'

import {
    createBatchMovement,
    getBatchMovements,
    type OperatorMovement,
} from '../../../services/operatorMovement.service'

import {
    getMovementStatuses,
    type MovementStatus,
} from '../../../services/movementStatus.service'

import { getCurrentUser, getCurrentRole } from '../../../services/auth.service'

import {
    getGarmentProcesses,
    type GarmentProcess,
} from '../../../services/garmentProcess.service'

import { getStock, type StockItem } from '../../../services/stock.service'

import { useFeedback } from '../../../context/FeedbackContext'

const emptyItemForm = {
    garment_id: '',
    garment_process_id: '',
    quantity_sent: 0,
    quantity_received: 0,
    notes: '',
}

const emptyMovementForm = {
    garment_id: '',
    from_status_id: '',
    to_status_id: '',
    quantity: 0,
    movement_type: 'recepcion',
    notes: '',
}

const OperatorBatchDetail = () => {
    const { id } = useParams()
    const batchId = id as string

    const [batch, setBatch] = useState<OperatorBatch | null>(null)
    const [items, setItems] = useState<OperatorBatchItem[]>([])
    const [garments, setGarments] = useState<Garment[]>([])
    const [statuses, setStatuses] = useState<MovementStatus[]>([])
    const [movements, setMovements] = useState<OperatorMovement[]>([])
    const [processes, setProcesses] = useState<GarmentProcess[]>([])
    const [itemForm, setItemForm] = useState(emptyItemForm)
    const [movementForm, setMovementForm] = useState(emptyMovementForm)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedStock, setSelectedStock] = useState<StockItem[]>([])
    const user = getCurrentUser();
    const role = getCurrentRole();
    const [canManageBatchItems, setcanManageBatchItems] = useState(role === 'admin' || role === 'client_operator')
    const canManageItems = role === 'admin' || role === 'client_operator'
    const [canMoveStock, setCanMoveStock] = useState(role === 'admin' || role === 'warehouse_operator');
    const isClient = role === 'client_operator'
    const { confirmAction, showAlert, showBackendError } = useFeedback()
    const batchGarments = useMemo(() => {
        return items
            .map((item) => item.garment)
            .filter(Boolean) as Garment[]
    }, [items])
    const selectedMovementItem = useMemo(() => {
        return items.find((item) => item.garment_id === movementForm.garment_id)
    }, [items, movementForm.garment_id])

    const selectedMovementGarment = selectedMovementItem?.garment

    const availableOriginStatuses = useMemo(() => {
        return selectedStock.filter((stock) => Number(stock.quantity) > 0)
    }, [selectedStock])

    const suggestedQuantity = selectedMovementItem?.quantity_received || 1

    const getAvailableMovementActions = () => {
        const currentBatchStatus = batch?.current_status?.code

        if (!currentBatchStatus) return []

        if (currentBatchStatus === 'EN_PROCESO') {
            return [
                { label: 'Enviar a reproceso', to: 'REPROCESO', type: 'reproceso' },
                { label: 'Preparar despacho', to: 'PREPARADO_DESPACHO', type: 'proceso' },
            ]
        }

        if (currentBatchStatus === 'REPROCESO') {
            return [
                { label: 'Volver a proceso', to: 'EN_PROCESO', type: 'proceso' },
                { label: 'Preparar despacho', to: 'PREPARADO_DESPACHO', type: 'proceso' },
            ]
        }

        if (currentBatchStatus === 'DERIVADO_EXTERNO') {
            return [
                { label: 'Enviar a traslado', to: 'EN_TRASLADO', type: 'retorno' },
            ]
        }

        if (currentBatchStatus === 'PREPARADO_DESPACHO') {
            return [
                { label: 'Enviar a traslado', to: 'EN_TRASLADO', type: 'retorno' },
            ]
        }

        if (currentBatchStatus === 'EN_TRASLADO') {
            return [
                { label: 'Retornar cliente', to: 'RETORNADO_CLIENTE', type: 'retorno' },
            ]
        }

        return []
    }

    const availableGarments = useMemo(() => {
        if (!batch) return []

        return garments.filter(
            (garment) =>
                garment.active &&
                !items.some((item) => item.garment_id === garment.id),
        )
    }, [garments, items])

    const loadData = async () => {
        const [
            batchData,
            itemsData,
            garmentsData,
            statusesData,
            movementsData,
            processesData,
        ] = await Promise.all([
            getOperatorBatchById(batchId),
            getBatchItems(batchId),
            getGarments(),
            getMovementStatuses(),
            getBatchMovements(batchId),
            getGarmentProcesses(),
        ])

        setProcesses(processesData.filter((process) => process.active))
        setBatch(batchData)
        setItems(itemsData)
        setGarments(garmentsData)
        setStatuses(statusesData)
        setMovements(movementsData)
    }

    const handleItemChange = (
        field: keyof typeof emptyItemForm,
        value: string | number,
    ) => {
        setItemForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleMovementChange = (
        field: keyof typeof emptyMovementForm,
        value: string | number,
    ) => {
        setMovementForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmitItem = async () => {
        if (!itemForm.garment_id) {
            alert('Debe seleccionar una prenda')
            return
        }

        if (itemForm.quantity_sent <= 0) {
            alert('La cantidad enviada debe ser mayor a cero')
            return
        }

        if (editingItemId) {
            await updateBatchItem(batchId, editingItemId, {
                garment_process_id: itemForm.garment_process_id || null,
                quantity_sent: Number(itemForm.quantity_sent),
                quantity_received: Number(itemForm.quantity_received),
                notes: itemForm.notes,
            })
        } else {
            await addBatchItem(batchId, {
                garment_id: itemForm.garment_id,
                garment_process_id: itemForm.garment_process_id || null,
                quantity_sent: Number(itemForm.quantity_sent),
                quantity_received: isClient
                    ? 0
                    : Number(itemForm.quantity_received),
                notes: itemForm.notes,
            })
        }

        setItemForm(emptyItemForm)
        setEditingItemId(null)
        await loadData()
    }

    const handleEditItem = (item: OperatorBatchItem) => {
        setEditingItemId(item.id)

        setItemForm({
            garment_id: item.garment_id,
            garment_process_id: item.garment_process_id || '',
            quantity_sent: item.quantity_sent,
            quantity_received: item.quantity_received,
            notes: item.notes || '',
        })
    }

    const handleRemoveItem = async (itemId: string) => {
        const confirmRemove = window.confirm('¿Eliminar prenda del lote?')

        if (!confirmRemove) return

        await removeBatchItem(batchId, itemId)
        await loadData()
    }

    const handleCancelItem = () => {
        setItemForm(emptyItemForm)
        setEditingItemId(null)
    }

    const handleSubmitMovement = async () => {
        if (!movementForm.garment_id) {
            alert('Debe seleccionar una prenda')
            return
        }

        if (!movementForm.to_status_id) {
            alert('Debe seleccionar estado destino')
            return
        }

        if (Number(movementForm.quantity) <= 0) {
            alert('La cantidad debe ser mayor a cero')
            return
        }

        try {
            await createBatchMovement(batchId, {
                garment_id: movementForm.garment_id,
                from_status_id: movementForm.from_status_id || null,
                to_status_id: movementForm.to_status_id,
                quantity: Number(movementForm.quantity),
                movement_type: movementForm.movement_type,
                notes: movementForm.notes,
            })

            setMovementForm(emptyMovementForm)
            await loadData()
        } catch (error: unknown) {
            let message = 'Error registrando movimiento'
            if (typeof error === 'string') {
                message = error
            } else if (error instanceof Error) {
                message = error.message
            } else if (typeof error === 'object' && error !== null) {
                const err = error as { response?: { data?: { message?: string } } }
                message = err.response?.data?.message || message
            }
            alert(message)
        }
    }

    const handleSelectMovementGarment = async (garmentId: string) => {
        const item = items.find((batchItem) => batchItem.garment_id === garmentId)

        if (!batch || !garmentId || !item) {
            setSelectedStock([])
            setMovementForm((prev) => ({
                ...prev,
                garment_id: garmentId,
                from_status_id: '',
                to_status_id: '',
                quantity: 1,
                movement_type: 'recepcion',
                notes: '',
            }))
            return
        }

        const stockData = await getStock({
            client_id: batch.client_id,
            garment_id: garmentId,
        })

        /* const stockWithQuantity = stockData.filter(
            (stock) => Number(stock.quantity) > 0,
        ) */

        //const firstStock = stockWithQuantity[0]

        const batchStatusCode = batch.current_status?.code

        let suggestedToStatusCode = ''
        let suggestedMovementType = 'proceso'

        if (batchStatusCode === 'PENDIENTE_RECEPCION') {
            suggestedToStatusCode = 'RECEPCIONADO'
            suggestedMovementType = 'recepcion'
        }

        if (batchStatusCode === 'RECEPCIONADO') {
            suggestedToStatusCode = 'EN_PROCESO'
            suggestedMovementType = 'proceso'
        }

        if (batchStatusCode === 'EN_PROCESO') {
            suggestedToStatusCode = 'PREPARADO_DESPACHO'
            suggestedMovementType = 'proceso'
        }

        if (batchStatusCode === 'REPROCESO') {
            suggestedToStatusCode = 'EN_PROCESO'
            suggestedMovementType = 'reproceso'
        }

        if (
            batchStatusCode === 'PREPARADO_DESPACHO' ||
            batchStatusCode === 'DERIVADO_EXTERNO'
        ) {
            suggestedToStatusCode = 'EN_TRASLADO'
            suggestedMovementType = 'retorno'
        }

        if (batchStatusCode === 'EN_TRASLADO') {
            suggestedToStatusCode = 'RETORNADO_CLIENTE'
            suggestedMovementType = 'retorno'
        }

        const suggestedToStatus = statuses.find(
            (status) => status.code === suggestedToStatusCode,
        )
        console.log('suggested to status', suggestedToStatus)
        console.log('current status', batch.current_status)
        setSelectedStock(stockData)

        setMovementForm((prev) => ({
            ...prev,
            garment_id: garmentId,
            from_status_id: batch.current_status?.id || '',
            to_status_id: suggestedToStatus?.id || '',
            quantity: item.quantity_received || item.quantity_sent || 1,
            movement_type: suggestedMovementType,
            notes: `Movimiento de ${item.garment?.code || 'prenda'}`,
        }))
    }

    const applyMovementAction = (toStatusCode: string, movementType: string) => {
        const toStatus = statuses.find((status) => status.code === toStatusCode)

        if (!toStatus) {
            alert(`No existe estado ${toStatusCode}`)
            return
        }

        setMovementForm((prev) => ({
            ...prev,
            to_status_id: toStatus.id,
            movement_type: movementType,
        }))
    }

    const handleDispatchBatch = async () => {
        if (!batch) return

        const confirmed = await confirmAction({
            title: 'Despachar lote a planta',
            message: 'Al despachar el lote, ya no podrá ser modificado por el cliente.',
            confirmText: 'Despachar',
            color: 'primary',
            fields: [
                { label: 'Lote', value: batch.batch_number },
                { label: 'Cliente', value: batch.client?.name },
                { label: 'Estado actual', value: batch.current_status?.name },
            ],
        })

        if (!confirmed) return

        try {
            await dispatchClientBatch(batch.id)
            showAlert('Lote despachado a planta correctamente', 'success')
            await loadData()
        } catch (error) {
            showBackendError(error, 'Error despachando lote')
        }
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            await loadData()
            setCanMoveStock(user.role?.name === 'admin' || user.role?.name === 'warehouse_operator');
            setcanManageBatchItems(user.role?.name === 'admin' || user.role?.name === 'client_operator');
            setLoading(false)
        }
        if (!loading)
            load()
    }, [batchId])

    const batchTotal = useMemo(() => {
        return items.reduce(
            (total, item) => total + Number(item.calculated_total || 0),
            0,
        )
    }, [items])

    return (
        <>
            <CCard className="mb-4">
                <CCardHeader>
                    <strong>Detalle de lote</strong>
                </CCardHeader>

                <CCardBody>
                    <CRow>
                        <CCol md={3}>
                            <strong>N° Lote:</strong>
                            <div>{batch?.batch_number || '-'}</div>
                        </CCol>

                        <CCol md={3}>
                            <strong>Cliente:</strong>
                            <div>{batch?.client?.name || '-'}</div>
                        </CCol>

                        <CCol md={3}>
                            <strong>Estado:</strong>
                            <div>{batch?.current_status?.name || '-'}</div>
                        </CCol>

                        <CCol md={3}>
                            <strong>Creado por:</strong>
                            <div>{batch?.creator?.name || '-'}</div>
                        </CCol>
                        {canManageBatchItems &&
                            batch?.current_status?.code === 'BORRADOR_CLIENTE' && (
                                <CCol md={3}>
                                    <CButton color="success" onClick={handleDispatchBatch}>
                                        Despachar a planta
                                    </CButton>
                                </CCol>
                            )}
                    </CRow>
                </CCardBody>
            </CCard>

            {canManageBatchItems &&
                (<CCard className="mb-4">
                    <CCardHeader>
                        <strong>Prendas del lote</strong>
                    </CCardHeader>

                    <CCardBody>
                        <CRow className="mb-3">
                            <CCol md={4}>
                                <CFormSelect
                                    label="Prenda"
                                    value={itemForm.garment_id}
                                    onChange={(e) => handleItemChange('garment_id', e.target.value)}
                                >
                                    <option value="">Seleccione prenda</option>

                                    {garments.map((garment) => (
                                        <option key={garment.id} value={garment.id}>
                                            {garment.code} - {garment.description || garment.type?.name}
                                        </option>
                                    ))}
                                </CFormSelect>
                            </CCol>

                            <CCol md={2}>
                                <CFormInput
                                    label="Cant. enviada"
                                    type="number"
                                    min={1}
                                    value={itemForm.quantity_sent}
                                    onChange={(e) =>
                                        handleItemChange('quantity_sent', Number(e.target.value))
                                    }
                                />
                            </CCol>

                            {!isClient && (
                                <CCol md={2}>
                                    <CFormInput
                                        label="Cant. recibida"
                                        type="number"
                                        min={0}
                                        value={itemForm.quantity_received}
                                        onChange={(e) =>
                                            handleItemChange('quantity_received', Number(e.target.value))
                                        }
                                    />
                                </CCol>
                            )}
                            <CCol md={3}>
                                <CFormSelect
                                    label="Proceso"
                                    value={itemForm.garment_process_id}
                                    onChange={(e) =>
                                        handleItemChange('garment_process_id', e.target.value)
                                    }
                                >
                                    <option value="">Seleccione proceso</option>
                                    {processes.map((process) => (
                                        <option key={process.id} value={process.id}>
                                            {process.name}
                                        </option>
                                    ))}
                                </CFormSelect>
                            </CCol>

                            <CCol md={4}>
                                <CFormTextarea
                                    label="Notas"
                                    rows={1}
                                    value={itemForm.notes}
                                    onChange={(e) => handleItemChange('notes', e.target.value)}
                                />
                            </CCol>
                        </CRow>

                        <CRow className="mb-4">
                            <CCol md={12} className="d-flex gap-2">
                                <CButton color="primary" onClick={handleSubmitItem}>
                                    {editingItemId ? 'Actualizar prenda' : 'Agregar prenda'}
                                </CButton>

                                {editingItemId && (
                                    <CButton color="secondary" onClick={handleCancelItem}>
                                        Cancelar
                                    </CButton>
                                )}
                            </CCol>
                        </CRow>
                        <div className="mb-3">
                            <strong>Total valorizado del lote:</strong>{' '}
                            ${batchTotal.toLocaleString('es-CL')}
                        </div>
                        <CTable hover responsive>
                            <CTableHead>
                                <CTableRow>
                                    <CTableHeaderCell>Código</CTableHeaderCell>
                                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                                    <CTableHeaderCell>Descripción</CTableHeaderCell>
                                    <CTableHeaderCell>Enviada</CTableHeaderCell>
                                    <CTableHeaderCell>Recibida</CTableHeaderCell>
                                    <CTableHeaderCell>Procesada</CTableHeaderCell>
                                    <CTableHeaderCell>Reproceso</CTableHeaderCell>
                                    <CTableHeaderCell>Retornada</CTableHeaderCell>
                                    <CTableHeaderCell>Proceso</CTableHeaderCell>
                                    <CTableHeaderCell>Valor base</CTableHeaderCell>
                                    <CTableHeaderCell>%</CTableHeaderCell>
                                    <CTableHeaderCell>Valor unit.</CTableHeaderCell>
                                    <CTableHeaderCell>Total</CTableHeaderCell>
                                    <CTableHeaderCell>Notas</CTableHeaderCell>
                                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                                </CTableRow>
                            </CTableHead>

                            <CTableBody>
                                {items.map((item) => (
                                    <CTableRow key={item.id}>
                                        <CTableDataCell>{item.garment?.code || '-'}</CTableDataCell>
                                        <CTableDataCell>{item.garment?.type?.name || '-'}</CTableDataCell>
                                        <CTableDataCell>{item.garment?.description || '-'}</CTableDataCell>
                                        <CTableDataCell>{item.quantity_sent}</CTableDataCell>
                                        <CTableDataCell>{item.quantity_received}</CTableDataCell>
                                        <CTableDataCell>{item.quantity_processed}</CTableDataCell>
                                        <CTableDataCell>{item.quantity_reprocessed}</CTableDataCell>
                                        <CTableDataCell>{item.quantity_returned}</CTableDataCell>
                                        <CTableDataCell>{item.process?.name || '-'}</CTableDataCell>

                                        <CTableDataCell>
                                            ${Number(item.unit_value || 0).toLocaleString('es-CL')}
                                        </CTableDataCell>

                                        <CTableDataCell>
                                            {Number(item.process_percentage || 0)}%
                                        </CTableDataCell>

                                        <CTableDataCell>
                                            ${Number(item.calculated_unit_value || 0).toLocaleString('es-CL')}
                                        </CTableDataCell>

                                        <CTableDataCell>
                                            <strong>
                                                ${Number(item.calculated_total || 0).toLocaleString('es-CL')}
                                            </strong>
                                        </CTableDataCell>
                                        <CTableDataCell>{item.notes || '-'}</CTableDataCell>
                                        <CTableDataCell>
                                            {canManageItems && batch?.current_status?.code === 'PENDIENTE_RECEPCION' && (
                                                <div className="d-flex gap-2">
                                                    <CButton
                                                        color="warning"
                                                        size="sm"
                                                        onClick={() => handleEditItem(item)}
                                                    >
                                                        Editar
                                                    </CButton>

                                                    <CButton
                                                        color="danger"
                                                        size="sm"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                    >
                                                        Eliminar
                                                    </CButton>
                                                </div>
                                            )}
                                        </CTableDataCell>
                                    </CTableRow>
                                ))}
                            </CTableBody>
                        </CTable>
                    </CCardBody>
                </CCard>)}

            {canMoveStock &&
                (
                    <>
                        <CCard className="mb-4">
                            <CCardHeader>
                                <strong>Registrar movimiento</strong>
                            </CCardHeader>

                            <CCardBody>
                                <CRow className="mb-3">
                                    <CCol md={3}>
                                        <CFormSelect
                                            label="Prenda"
                                            value={movementForm.garment_id}
                                            onChange={(e) => handleSelectMovementGarment(e.target.value)}
                                        >
                                            <option value="">Seleccione prenda</option>
                                            {batchGarments.map((garment) => (
                                                <option key={garment.id} value={garment.id}>
                                                    {garment.code} - {garment.description || garment.type?.name}
                                                </option>
                                            ))}
                                        </CFormSelect>
                                    </CCol>

                                    <CCol md={3}>
                                        <CFormSelect
                                            label="Estado origen"
                                            value={movementForm.from_status_id}
                                            onChange={(e) =>
                                                handleMovementChange('from_status_id', e.target.value)
                                            }
                                        >
                                            <option value="">Sin origen / ingreso inicial</option>

                                            {availableOriginStatuses.map((stock) => (
                                                <option key={stock.status_id} value={stock.status_id}>
                                                    {stock.status?.name} - Disponible: {stock.quantity}
                                                </option>
                                            ))}
                                        </CFormSelect>
                                    </CCol>

                                    <CCol md={3}>
                                        <CFormSelect
                                            label="Estado destino"
                                            value={movementForm.to_status_id}
                                            onChange={(e) =>
                                                handleMovementChange('to_status_id', e.target.value)
                                            }
                                        >
                                            <option value="">Seleccione destino</option>
                                            {statuses.map((status) => (
                                                <option key={status.id} value={status.id}>
                                                    {status.name}
                                                </option>
                                            ))}
                                        </CFormSelect>
                                    </CCol>

                                    <CCol md={3}>
                                        <CFormSelect
                                            label="Tipo movimiento"
                                            value={movementForm.movement_type}
                                            onChange={(e) =>
                                                handleMovementChange('movement_type', e.target.value)
                                            }
                                        >
                                            <option value="recepcion">Recepción</option>
                                            <option value="proceso">Proceso</option>
                                            <option value="reproceso">Reproceso</option>
                                            <option value="retorno">Retorno</option>
                                            <option value="ajuste">Ajuste</option>
                                        </CFormSelect>
                                    </CCol>
                                </CRow>
                                {selectedMovementItem && (
                                    <CAlert color="info" className="mt-3">
                                        <strong>Prenda seleccionada:</strong>{' '}
                                        {selectedMovementGarment?.code} -{' '}
                                        {selectedMovementGarment?.description || selectedMovementGarment?.type?.name}
                                        <br />

                                        <strong>Proceso:</strong>{' '}
                                        {selectedMovementItem.process?.name || '-'} |{' '}
                                        <strong>Valor línea:</strong>{' '}
                                        ${Number(selectedMovementItem.calculated_total || 0).toLocaleString('es-CL')}
                                        <br />

                                        <strong>Enviada:</strong> {selectedMovementItem.quantity_sent} |{' '}
                                        <strong>Recibida:</strong> {selectedMovementItem.quantity_received} |{' '}
                                        <strong>Procesada:</strong> {selectedMovementItem.quantity_processed} |{' '}
                                        <strong>Reproceso:</strong> {selectedMovementItem.quantity_reprocessed} |{' '}
                                        <strong>Retornada:</strong> {selectedMovementItem.quantity_returned}
                                    </CAlert>
                                )}
                                {movementForm.garment_id && (
                                    <div className="mb-3">
                                        <strong>Stock actual de la prenda:</strong>

                                        <div className="d-flex gap-2 flex-wrap mt-2">
                                            {availableOriginStatuses.length > 0 ? (
                                                availableOriginStatuses.map((stock) => (
                                                    <CBadge color="secondary" key={stock.id}>
                                                        {stock.status?.name}: {stock.quantity}
                                                    </CBadge>
                                                ))
                                            ) : (
                                                <CBadge color="warning">
                                                    Sin stock registrado
                                                </CBadge>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {movementForm.garment_id && getAvailableMovementActions().length > 0 && (
                                    <div className="mb-3">
                                        <strong>Acciones disponibles:</strong>

                                        <div className="d-flex gap-2 flex-wrap mt-2">
                                            {getAvailableMovementActions().map((action) => (
                                                <CButton
                                                    key={action.to}
                                                    color="primary"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => applyMovementAction(action.to, action.type)}
                                                >
                                                    {action.label}
                                                </CButton>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <CRow className="mb-4">
                                    <CCol md={2}>
                                        <CFormInput
                                            label="Cantidad"
                                            type="number"
                                            min={1}
                                            value={movementForm.quantity}
                                            onChange={(e) =>
                                                handleMovementChange('quantity', Number(e.target.value))
                                            }
                                        />
                                    </CCol>

                                    <CCol md={8}>
                                        <CFormTextarea
                                            label="Notas"
                                            rows={1}
                                            value={movementForm.notes}
                                            onChange={(e) =>
                                                handleMovementChange('notes', e.target.value)
                                            }
                                        />
                                    </CCol>

                                    <CCol md={2} className="d-flex align-items-end">
                                        <CButton color="primary" onClick={handleSubmitMovement}>
                                            Registrar
                                        </CButton>
                                    </CCol>
                                </CRow>
                            </CCardBody>
                        </CCard>

                        <CCard>
                            <CCardHeader>
                                <strong>Historial de movimientos</strong>
                            </CCardHeader>

                            <CCardBody>
                                <CTable hover responsive>
                                    <CTableHead>
                                        <CTableRow>
                                            <CTableHeaderCell>Fecha</CTableHeaderCell>
                                            <CTableHeaderCell>Prenda</CTableHeaderCell>
                                            <CTableHeaderCell>Desde</CTableHeaderCell>
                                            <CTableHeaderCell>Hacia</CTableHeaderCell>
                                            <CTableHeaderCell>Cantidad</CTableHeaderCell>
                                            <CTableHeaderCell>Tipo</CTableHeaderCell>
                                            <CTableHeaderCell>Usuario</CTableHeaderCell>
                                            <CTableHeaderCell>Notas</CTableHeaderCell>
                                        </CTableRow>
                                    </CTableHead>

                                    <CTableBody>
                                        {movements.map((movement) => (
                                            <CTableRow key={movement.id}>
                                                <CTableDataCell>
                                                    {new Date(movement.createdAt).toLocaleString()}
                                                </CTableDataCell>
                                                <CTableDataCell>
                                                    {movement.garment?.code || '-'}
                                                </CTableDataCell>
                                                <CTableDataCell>
                                                    {movement.from_status?.name || 'Ingreso inicial'}
                                                </CTableDataCell>
                                                <CTableDataCell>
                                                    {movement.to_status?.name || '-'}
                                                </CTableDataCell>
                                                <CTableDataCell>{movement.quantity}</CTableDataCell>
                                                <CTableDataCell>{movement.movement_type}</CTableDataCell>
                                                <CTableDataCell>{movement.creator?.name || '-'}</CTableDataCell>
                                                <CTableDataCell>{movement.notes || '-'}</CTableDataCell>
                                            </CTableRow>
                                        ))}
                                    </CTableBody>
                                </CTable>
                            </CCardBody>
                        </CCard>
                    </>
                )}
        </>

    )
}

export default OperatorBatchDetail
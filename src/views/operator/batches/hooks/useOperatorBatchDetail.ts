import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
    dispatchClientBatch,
    getOperatorBatchById,
    type OperatorBatch,
} from '../../../../services/operatorBatch.service'
import {
    addBatchItem,
    getBatchItems,
    removeBatchItem,
    updateBatchItem,
    type OperatorBatchItem,
} from '../../../../services/operatorBatchItem.service'
import { getGarments, type Garment } from '../../../../services/garment.service'
import {
    createBatchIncident,
    createBatchMovement,
    getBatchMovements,
    type CreateIncidentPayload,
    type OperatorMovement,
} from '../../../../services/operatorMovement.service'
import {
    getMovementStatuses,
    type MovementStatus,
} from '../../../../services/movementStatus.service'
import { getCurrentRole } from '../../../../services/auth.service'
import { useFeedback } from '../../../../context/FeedbackContext'

/**
 * =====================================================
 * TYPES
 * =====================================================
 */

export type OperatorBatchItemForm = {
    garment_id: string
    quantity_sent: number
    quantity_received: number
    notes: string
}

export type OperatorBatchMovementForm = {
    garment_id: string
    from_status_id: string
    to_status_id: string
    quantity: number
    movement_type: string
    notes: string
}

export type MovementAction = {
    label: string
    from: string
    to: string
    type: string
}

export type BatchStatusBalance = {
    id: string
    garment_id: string
    status_id: string
    quantity: number
    status?: MovementStatus
}

export type BatchCurrentStateRow = {
    id: string
    garment_id: string
    garment_code: string
    garment_name: string
    status_id: string
    status_code: string
    status_name: string
    quantity: number
}

export const FUNCTIONAL_MOVEMENT_STATUS_CODES = [
    'BORRADOR_CLIENTE',
    'PENDIENTE_RECEPCION',
    'EN_PROCESO',
    'EN_TRASLADO',
    'CERRADO',
    'RESUELTO_INCIDENCIA',
] as const

/**
 * =====================================================
 * SALDO DE UNA PRENDA POR ESTADO
 * =====================================================
 */

export function buildBatchGarmentStatusBalances(
    movements: OperatorMovement[],
    statuses: MovementStatus[],
    garmentId: string,
): BatchStatusBalance[] {
    if (!garmentId) {
        return []
    }

    const balanceByStatus = new Map<string, number>()

    for (const movement of movements) {
        if (movement.garment_id !== garmentId) {
            continue
        }

        const quantity = Number(movement.quantity || 0)

        if (movement.to_status_id) {
            balanceByStatus.set(
                movement.to_status_id,
                (balanceByStatus.get(movement.to_status_id) || 0) + quantity,
            )
        }

        if (movement.from_status_id) {
            balanceByStatus.set(
                movement.from_status_id,
                (balanceByStatus.get(movement.from_status_id) || 0) - quantity,
            )
        }
    }

    return Array.from(balanceByStatus.entries())
        .filter(([, quantity]) => quantity > 0)
        .map(([statusId, quantity]) => ({
            id: `${garmentId}:${statusId}`,
            garment_id: garmentId,
            status_id: statusId,
            quantity,
            status: statuses.find((status) => status.id === statusId),
        }))
}

/**
 * =====================================================
 * ESTADO ACTUAL DE TODAS LAS PRENDAS DEL LOTE
 * =====================================================
 */

export function buildBatchCurrentState(
    movements: OperatorMovement[],
    statuses: MovementStatus[],
    batchGarments: Garment[],
): BatchCurrentStateRow[] {
    const statusById = new Map<string, MovementStatus>()

    for (const status of statuses) {
        statusById.set(status.id, status)
    }

    for (const movement of movements) {
        if (movement.from_status) {
            statusById.set(movement.from_status.id, movement.from_status)
        }

        if (movement.to_status) {
            statusById.set(movement.to_status.id, movement.to_status)
        }
    }

    return batchGarments.flatMap((garment) => {
        const balances = buildBatchGarmentStatusBalances(
            movements,
            Array.from(statusById.values()),
            garment.id,
        )

        return balances.map((balance) => {
            const status = statusById.get(balance.status_id)

            return {
                id: `${garment.id}:${balance.status_id}`,
                garment_id: garment.id,
                garment_code: garment.code,
                garment_name: garment.size || garment.description || 'Sin nombre',
                status_id: balance.status_id,
                status_code: status?.code || '',
                status_name: status?.name || 'Estado desconocido',
                quantity: balance.quantity,
            }
        })
    })
}

/**
 * =====================================================
 * EMPTY FORMS
 * =====================================================
 */

export const emptyItemForm: OperatorBatchItemForm = {
    garment_id: '',
    quantity_sent: 0,
    quantity_received: 0,
    notes: '',
}

export const emptyMovementForm: OperatorBatchMovementForm = {
    garment_id: '',
    from_status_id: '',
    to_status_id: '',
    quantity: 0,
    movement_type: 'recepcion_planta',
    notes: '',
}

/**
 * =====================================================
 * HOOK
 * =====================================================
 */

export function useOperatorBatchDetail() {
    /**
     * =====================================================
     * ROUTE
     * =====================================================
     */

    const { id } = useParams()
    const batchId = id as string

    /**
     * =====================================================
     * FEEDBACK
     * =====================================================
     */

    const { confirmAction, showAlert, showBackendError } = useFeedback()

    /**
     * =====================================================
     * USER / ROLE
     * =====================================================
     */

    const role = getCurrentRole()

    /**
     * Crear/editar prendas del lote.
     *
     * Corresponde al cliente y al administrador.
     */
    const canManageBatchItems = role === 'admin' || role === 'client_operator'

    /**
     * Registrar movimientos operativos manuales.
     *
     * IMPORTANTE:
     * client_operator NO es operador de bodega.
     *
     * La recepción del cliente se ejecuta mediante una
     * acción específica EN_TRASLADO -> CERRADO.
     */
    const canMoveStock = role === 'admin' || role === 'warehouse_operator'

    const canManageItems = role === 'admin' || role === 'client_operator'
    const isClient = role === 'client_operator'

    /**
     * =====================================================
     * MAIN STATE
     * =====================================================
     */

    const [batch, setBatch] = useState<OperatorBatch | null>(null)
    const [items, setItems] = useState<OperatorBatchItem[]>([])
    const [garments, setGarments] = useState<Garment[]>([])
    const [statuses, setStatuses] = useState<MovementStatus[]>([])
    const [movements, setMovements] = useState<OperatorMovement[]>([])
    const [selectedStock, setSelectedStock] = useState<BatchStatusBalance[]>([])
    const [itemForm, setItemForm] = useState<OperatorBatchItemForm>(emptyItemForm)
    const [movementForm, setMovementForm] = useState<OperatorBatchMovementForm>(emptyMovementForm)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    /**
     * =====================================================
     * DERIVED DATA
     * =====================================================
     */

    const batchGarments = useMemo(() => {
        return items.map((item) => item.garment).filter(Boolean) as Garment[]
    }, [items])

    const selectedMovementItem = useMemo(() => {
        return items.find((item) => item.garment_id === movementForm.garment_id)
    }, [items, movementForm.garment_id])

    const selectedMovementGarment = selectedMovementItem?.garment

    const availableOriginStatuses = useMemo(() => {
        return selectedStock.filter((stock) => Number(stock.quantity) > 0)
    }, [selectedStock])

    const availableGarments = useMemo(() => {
        if (!batch) {
            return []
        }

        return garments.filter(
            (garment) =>
                garment.active &&
                garment.client_id === batch.client_id &&
                !items.some((item) => item.garment_id === garment.id),
        )
    }, [garments, items, batch])

    const selectedItemGarment = useMemo(() => {
        return garments.find((garment) => garment.id === itemForm.garment_id) || null
    }, [garments, itemForm.garment_id])

    const itemPreviewTotal = useMemo(() => {
        if (!selectedItemGarment) {
            return 0
        }

        return Number(selectedItemGarment.value || 0) * Number(itemForm.quantity_sent || 0)
    }, [selectedItemGarment, itemForm.quantity_sent])

    const batchTotal = useMemo(() => {
        return items.reduce((total, item) => total + Number(item.calculated_total || 0), 0)
    }, [items])

    /**
     * =====================================================
     * LOAD DATA
     * =====================================================
     */

    const loadData = async () => {
        if (!batchId) {
            return
        }

        const [batchData, itemsData, garmentsData, statusesData, movementsData] = await Promise.all([
            getOperatorBatchById(batchId),
            getBatchItems(batchId),
            getGarments(),
            getMovementStatuses(),
            getBatchMovements(batchId),
        ])

        setBatch(batchData)
        setItems(itemsData)
        setGarments(garmentsData)

        setStatuses(
            statusesData.filter((status) =>
                FUNCTIONAL_MOVEMENT_STATUS_CODES.includes(
                    status.code as (typeof FUNCTIONAL_MOVEMENT_STATUS_CODES)[number],
                ),
            ),
        )

        setMovements(movementsData)
    }

    /**
     * =====================================================
     * ITEM FORM
     * =====================================================
     */

    const handleItemChange = (
        field: keyof OperatorBatchItemForm,
        value: string | number,
    ) => {
        setItemForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    /**
     * =====================================================
     * MOVEMENT FORM
     * =====================================================
     */

    const handleMovementChange = (
        field: keyof OperatorBatchMovementForm,
        value: string | number,
    ) => {
        setMovementForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    /**
     * =====================================================
     * SAVE ITEM
     * =====================================================
     */

    const handleSubmitItem = async () => {
        if (!itemForm.garment_id) {
            showAlert('Debe seleccionar una prenda', 'warning')
            return
        }

        if (Number(itemForm.quantity_sent) <= 0) {
            showAlert('La cantidad enviada debe ser mayor a cero', 'warning')
            return
        }

        if (!batch) {
            showAlert('Lote no encontrado', 'danger')
            return
        }

        const garment = garments.find((item) => item.id === itemForm.garment_id)

        if (!garment) {
            showAlert('Prenda no encontrada', 'danger')
            return
        }

        /**
         * Protección frontend.
         *
         * El backend debe continuar validando esta regla.
         */
        if (garment.client_id !== batch.client_id) {
            showAlert('La prenda no pertenece al cliente del lote', 'danger')
            return
        }

        try {
            if (editingItemId) {
                await updateBatchItem(batchId, editingItemId, {
                    quantity_sent: Number(itemForm.quantity_sent),
                    quantity_received: Number(itemForm.quantity_received),
                    notes: itemForm.notes,
                })

                showAlert('Prenda del lote actualizada correctamente', 'success')
            } else {
                await addBatchItem(batchId, {
                    garment_id: itemForm.garment_id,
                    quantity_sent: Number(itemForm.quantity_sent),
                    quantity_received: isClient ? 0 : Number(itemForm.quantity_received),
                    notes: itemForm.notes,
                })

                showAlert('Prenda agregada al lote correctamente', 'success')
            }

            setItemForm(emptyItemForm)
            setEditingItemId(null)

            await loadData()
        } catch (error) {
            showBackendError(error, 'Error guardando prenda del lote')
        }
    }

    /**
     * =====================================================
     * EDIT ITEM
     * =====================================================
     */

    const handleEditItem = (item: OperatorBatchItem) => {
        setEditingItemId(item.id)

        setItemForm({
            garment_id: item.garment_id,
            quantity_sent: item.quantity_sent,
            quantity_received: item.quantity_received,
            notes: item.notes || '',
        })
    }

    /**
     * =====================================================
     * REMOVE ITEM
     * =====================================================
     */

    const handleRemoveItem = async (itemId: string) => {
        const item = items.find((currentItem) => currentItem.id === itemId)

        if (!item) {
            showAlert('Prenda no encontrada', 'danger')
            return
        }

        const confirmed = await confirmAction({
            title: 'Eliminar prenda del lote',
            message: '¿Seguro que deseas eliminar esta prenda del lote?',
            confirmText: 'Eliminar',
            color: 'danger',
            fields: [
                {
                    label: 'Código',
                    value: item.garment?.code,
                },
                {
                    label: 'Cantidad',
                    value: item.quantity_sent,
                },
            ],
        })

        if (!confirmed.confirmed) {
            return
        }

        try {
            await removeBatchItem(batchId, itemId)

            showAlert('Prenda eliminada correctamente', 'success')

            await loadData()
        } catch (error) {
            showBackendError(error, 'Error eliminando prenda del lote')
        }
    }

    /**
     * =====================================================
     * CANCEL ITEM EDIT
     * =====================================================
     */

    const handleCancelItem = () => {
        setItemForm(emptyItemForm)
        setEditingItemId(null)
    }

    /**
     * =====================================================
     * MOVEMENT RULES
     * =====================================================
     */

    const getAvailableMovementActions = (): MovementAction[] => {
        if (!movementForm.garment_id) {
            return []
        }

        const hasPendingReception = selectedStock.some(
            (balance) =>
                balance.status?.code === 'PENDIENTE_RECEPCION' &&
                Number(balance.quantity || 0) > 0,
        )

        const hasProcessed = selectedStock.some(
            (balance) =>
                balance.status?.code === 'EN_PROCESO' &&
                Number(balance.quantity || 0) > 0,
        )

        const hasInTransit = selectedStock.some(
            (balance) =>
                balance.status?.code === 'EN_TRASLADO' &&
                Number(balance.quantity || 0) > 0,
        )

        const actions: MovementAction[] = []

        if ((role === 'admin' || role === 'warehouse_operator') && hasPendingReception) {
            actions.push({
                label: 'Procesar pendientes',
                from: 'PENDIENTE_RECEPCION',
                to: 'EN_PROCESO',
                type: 'recepcion_planta',
            })
        }

        if ((role === 'admin' || role === 'warehouse_operator') && hasProcessed) {
            actions.push({
                label: 'Enviar procesadas a traslado',
                from: 'EN_PROCESO',
                to: 'EN_TRASLADO',
                type: 'inicio_traslado',
            })
        }

        if ((role === 'admin' || role === 'client_operator') && hasInTransit) {
            actions.push({
                label: 'Confirmar recepción',
                from: 'EN_TRASLADO',
                to: 'CERRADO',
                type: 'recepcion_cliente',
            })
        }

        return actions
    }

    /**
     * =====================================================
     * SELECT MOVEMENT GARMENT
     * =====================================================
     */

    const handleSelectMovementGarment = (garmentId: string) => {
        const item = items.find((batchItem) => batchItem.garment_id === garmentId)

        if (!garmentId || !item) {
            setSelectedStock([])

            setMovementForm({
                ...emptyMovementForm,
                garment_id: garmentId,
            })

            return
        }

        const batchStatusBalances = buildBatchGarmentStatusBalances(
            movements,
            statuses,
            garmentId,
        )

        setSelectedStock(batchStatusBalances)

        const pendingBalance = batchStatusBalances.find(
            (balance) =>
                balance.status?.code === 'PENDIENTE_RECEPCION' &&
                Number(balance.quantity || 0) > 0,
        )

        const processedBalance = batchStatusBalances.find(
            (balance) =>
                balance.status?.code === 'EN_PROCESO' &&
                Number(balance.quantity || 0) > 0,
        )

        const inTransitBalance = batchStatusBalances.find(
            (balance) =>
                balance.status?.code === 'EN_TRASLADO' &&
                Number(balance.quantity || 0) > 0,
        )

        const defaultBalance =
            role === 'client_operator'
                ? inTransitBalance || null
                : pendingBalance || processedBalance || null

        const defaultDestinationCode =
            role === 'client_operator'
                ? inTransitBalance
                    ? 'CERRADO'
                    : ''
                : pendingBalance
                    ? 'EN_PROCESO'
                    : processedBalance
                        ? 'EN_TRASLADO'
                        : ''

        const defaultMovementType =
            role === 'client_operator'
                ? inTransitBalance
                    ? 'recepcion_cliente'
                    : 'ajuste'
                : pendingBalance
                    ? 'recepcion_planta'
                    : processedBalance
                        ? 'inicio_traslado'
                        : 'ajuste'

        const defaultDestination = defaultDestinationCode
            ? statuses.find((status) => status.code === defaultDestinationCode)
            : null

        setMovementForm({
            garment_id: garmentId,
            from_status_id: defaultBalance?.status_id || '',
            to_status_id: defaultDestination?.id || '',
            quantity: Number(defaultBalance?.quantity || 0),
            movement_type: defaultMovementType,
            notes: `Movimiento de ${item.garment?.size ||
                item.garment?.description ||
                item.garment?.code ||
                'prenda'
                }`,
        })
    }

    /**
     * =====================================================
     * APPLY MOVEMENT ACTION
     * =====================================================
     *
     * Esta función prepara el formulario de movimientos.
     *
     * No ejecuta el movimiento.
     *
     * La recepción del cliente utiliza
     * handleConfirmReception(), porque el cliente no debe
     * depender del formulario operativo de bodega.
     * =====================================================
     */

    const applyMovementAction = (
        fromStatusCode: string,
        toStatusCode: string,
        movementType: string,
        garmentId?: string,
    ) => {
        const fromStatus = statuses.find((status) => status.code === fromStatusCode)
        const toStatus = statuses.find((status) => status.code === toStatusCode)

        if (!fromStatus || !toStatus) {
            showAlert('No se encontraron los estados necesarios para el movimiento', 'warning')
            return
        }

        const targetGarmentId = garmentId || movementForm.garment_id

        if (!targetGarmentId) {
            showAlert('Debe seleccionar una prenda', 'warning')
            return
        }

        const balances = buildBatchGarmentStatusBalances(
            movements,
            statuses,
            targetGarmentId,
        )

        const originBalance = balances.find(
            (balance) =>
                balance.status_id === fromStatus.id &&
                Number(balance.quantity || 0) > 0,
        )

        if (!originBalance) {
            showAlert(`No existen unidades disponibles en ${fromStatus.name}`, 'warning')
            return
        }

        const item = items.find(
            (batchItem) => batchItem.garment_id === targetGarmentId,
        )

        setSelectedStock(balances)

        setMovementForm({
            garment_id: targetGarmentId,
            from_status_id: fromStatus.id,
            to_status_id: toStatus.id,
            quantity: Number(originBalance.quantity),
            movement_type: movementType,
            notes: `Movimiento de ${item?.garment?.size ||
                item?.garment?.description ||
                item?.garment?.code ||
                'prenda'
                }`,
        })
    }

    /**
     * =====================================================
     * CREATE MOVEMENT
     * =====================================================
     *
     * Utilizado por el formulario operativo de bodega.
     * =====================================================
     */

    const handleSubmitMovement = async () => {
        if (!movementForm.garment_id) {
            showAlert('Debe seleccionar una prenda', 'warning')
            return
        }

        if (!movementForm.to_status_id) {
            showAlert('Debe seleccionar estado destino', 'warning')
            return
        }

        if (Number(movementForm.quantity) <= 0) {
            showAlert('La cantidad debe ser mayor a cero', 'warning')
            return
        }

        const selectedOriginBalance = movementForm.from_status_id
            ? selectedStock.find(
                (stock) => stock.status_id === movementForm.from_status_id,
            )
            : null

        if (
            movementForm.from_status_id &&
            (!selectedOriginBalance ||
                Number(movementForm.quantity) > Number(selectedOriginBalance.quantity))
        ) {
            showAlert(
                `Este lote solo dispone de ${Number(
                    selectedOriginBalance?.quantity || 0,
                )} unidades de esta prenda en el estado origen`,
                'warning',
            )

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
            setSelectedStock([])

            showAlert('Movimiento registrado correctamente', 'success')

            await loadData()
        } catch (error) {
            showBackendError(error, 'Error registrando movimiento')
        }
    }

    /**
     * =====================================================
     * CONFIRMAR RECEPCIÓN DEL CLIENTE
     *
     * EN_TRASLADO -> CERRADO
     * =====================================================
     *
     * A diferencia de applyMovementAction(), esta función
     * EJECUTA directamente el movimiento.
     *
     * Esto es necesario porque client_operator no debe ver
     * ni utilizar el formulario "Registrar movimiento".
     * =====================================================
     */

    const handleConfirmReception = async (garmentId: string) => {
        if (!batch) {
            showAlert('Lote no encontrado', 'danger')
            return
        }

        if (role !== 'admin' && role !== 'client_operator') {
            showAlert('No tienes permisos para confirmar la recepción', 'warning')
            return
        }

        if (!garmentId) {
            showAlert('Debe seleccionar una prenda', 'warning')
            return
        }

        const fromStatus = statuses.find(
            (status) => status.code === 'EN_TRASLADO',
        )

        const toStatus = statuses.find(
            (status) => status.code === 'CERRADO',
        )

        if (!fromStatus || !toStatus) {
            showAlert(
                'No se encontraron los estados necesarios para confirmar la recepción',
                'warning',
            )

            return
        }

        /**
         * Calculamos nuevamente el saldo desde los movimientos
         * actuales.
         *
         * No dependemos de movementForm ni de selectedStock.
         */
        const balances = buildBatchGarmentStatusBalances(
            movements,
            statuses,
            garmentId,
        )

        const originBalance = balances.find(
            (balance) =>
                balance.status_id === fromStatus.id &&
                Number(balance.quantity || 0) > 0,
        )

        if (!originBalance) {
            showAlert(
                'Esta prenda ya no tiene unidades pendientes de recepción',
                'warning',
            )

            return
        }

        const item = items.find(
            (batchItem) => batchItem.garment_id === garmentId,
        )

        if (!item) {
            showAlert('La prenda no pertenece al lote', 'danger')
            return
        }

        const garmentName =
            item.garment?.size ||
            item.garment?.description ||
            item.garment?.code ||
            'Prenda'

        const quantity = Number(originBalance.quantity)

        const confirmed = await confirmAction({
            title: 'Confirmar recepción',
            message:
                'Confirma que estas unidades fueron recibidas correctamente por el cliente.',
            confirmText: 'Confirmar recepción',
            color: 'success',
            showConformityCheck: true,
            observationLabel: 'Observaciones de recepción',
            observationPlaceholder: 'Ejemplo: prendas recibidas conforme',
            fields: [
                {
                    label: 'Lote',
                    value: batch.batch_number,
                },
                {
                    label: 'Cliente',
                    value: batch.client?.name,
                },
                {
                    label: 'Prenda',
                    value: `${item.garment?.code || '-'} - ${garmentName}`,
                },
                {
                    label: 'Cantidad',
                    value: quantity,
                },
                {
                    label: 'Estado actual',
                    value: fromStatus.name,
                },
                {
                    label: 'Nuevo estado',
                    value: toStatus.name,
                },
            ],
        })

        if (!confirmed.confirmed) {
            return
        }

        try {
            await createBatchMovement(batchId, {
                garment_id: garmentId,
                from_status_id: fromStatus.id,
                to_status_id: toStatus.id,
                quantity,
                movement_type: 'recepcion_cliente',
                notes:
                    confirmed.observation?.trim() ||
                    `Recepción confirmada por cliente: ${garmentName}`,
            })

            setMovementForm(emptyMovementForm)
            setSelectedStock([])

            showAlert('Recepción confirmada correctamente', 'success')

            await loadData()
        } catch (error) {
            showBackendError(error, 'Error confirmando recepción')
        }
    }

    /**
     * =====================================================
     * DISPATCH CLIENT BATCH
     *
     * CLIENTE -> PLANTA
     * =====================================================
     */

    const handleDispatchBatch = async () => {
        if (!batch) {
            return
        }

        const details = items.map((item) => ({
            item:
                item.garment?.size ||
                item.garment?.description ||
                item.garment?.code ||
                'Artículo sin nombre',
            quantity: item.quantity_sent,
        }))

        const confirmed = await confirmAction({
            title: 'Despachar lote a planta',
            message: 'Al despachar el lote, ya no podrá ser modificado por el cliente.',
            confirmText: 'Despachar',
            color: 'primary',
            fields: [
                {
                    label: 'Lote',
                    value: batch.batch_number,
                },
                {
                    label: 'Cliente',
                    value: batch.client?.name,
                },
                {
                    label: 'Estado actual',
                    value: batch.current_status?.name,
                },
            ],
            details,
        })

        if (!confirmed.confirmed) {
            return
        }

        try {
            await dispatchClientBatch(batch.id)

            showAlert('Lote despachado a planta correctamente', 'success')

            await loadData()
        } catch (error) {
            showBackendError(error, 'Error despachando lote')
        }
    }

    /**
     * =====================================================
     * CLOSE WITH INCIDENT
     * =====================================================
     */

    const handleCreateIncident = async (payload: CreateIncidentPayload) => {
        try {
            const result = await createBatchIncident(batchId, payload)

            showAlert(
                result.batch_resolved
                    ? 'Incidencia registrada. El lote quedó completamente resuelto.'
                    : 'Incidencia registrada correctamente.',
                'success',
            )

            setMovementForm(emptyMovementForm)
            setSelectedStock([])

            await loadData()

            return true
        } catch (error) {
            showBackendError(error, 'Error cerrando con incidencia')

            return false
        }
    }

    /**
     * =====================================================
     * INITIAL LOAD
     * =====================================================
     */

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)

                await loadData()
            } catch (error) {
                showBackendError(error, 'Error cargando detalle del lote')
            } finally {
                setLoading(false)
            }
        }

        void load()

        /*
         * Deliberadamente dependemos del batchId.
         *
         * Si React reutiliza la pantalla para otro lote,
         * volvemos a cargar los datos.
         */

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchId])

    /**
     * =====================================================
     * PUBLIC API
     * =====================================================
     */

    return {
        // Route
        batchId,

        // Data
        batch,
        items,
        garments,
        statuses,
        movements,
        selectedStock,

        // Forms
        itemForm,
        movementForm,
        editingItemId,

        // State
        loading,

        // User / permissions
        role,
        canManageBatchItems,
        canMoveStock,
        canManageItems,
        isClient,

        // Derived
        batchGarments,
        selectedMovementItem,
        selectedMovementGarment,
        availableOriginStatuses,
        availableGarments,
        selectedItemGarment,
        itemPreviewTotal,
        batchTotal,

        // Forms
        handleItemChange,
        handleMovementChange,

        // Items
        handleSubmitItem,
        handleEditItem,
        handleRemoveItem,
        handleCancelItem,

        // Movements
        getAvailableMovementActions,
        handleSelectMovementGarment,
        applyMovementAction,
        handleSubmitMovement,
        handleConfirmReception,
        handleCreateIncident,

        // Batch
        handleDispatchBatch,

        // Reload
        loadData,
    }
}
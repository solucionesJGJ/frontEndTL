import React, {
    useEffect,
    useMemo,
    useState,
} from 'react'

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
    useParams,
} from 'react-router-dom'

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

import {
    getGarments,
    type Garment,
} from '../../../services/garment.service'

import {
    createBatchMovement,
    getBatchMovements,
    type OperatorMovement,
} from '../../../services/operatorMovement.service'

import {
    getMovementStatuses,
    type MovementStatus,
} from '../../../services/movementStatus.service'

import {
    getCurrentUser,
    getCurrentRole,
} from '../../../services/auth.service'

import {
    getStock,
    type StockItem,
} from '../../../services/stock.service'

import {
    useFeedback,
} from '../../../context/FeedbackContext'


/**
 * Formulario para agregar / editar
 * prendas de un lote.
 *
 * Ya no existe garment_process_id.
 */
const emptyItemForm = {
    garment_id: '',
    quantity_sent: 0,
    quantity_received: 0,
    notes: '',
}


/**
 * Formulario para movimientos internos
 * de las prendas.
 */
const emptyMovementForm = {
    garment_id: '',
    from_status_id: '',
    to_status_id: '',
    quantity: 0,
    movement_type: 'recepcion',
    notes: '',
}


const OperatorBatchDetail = () => {

    const {
        id,
    } = useParams()

    const batchId =
        id as string


    const [
        batch,
        setBatch,
    ] = useState<OperatorBatch | null>(
        null,
    )

    const [
        items,
        setItems,
    ] = useState<OperatorBatchItem[]>(
        [],
    )

    const [
        garments,
        setGarments,
    ] = useState<Garment[]>(
        [],
    )

    const [
        statuses,
        setStatuses,
    ] = useState<MovementStatus[]>(
        [],
    )

    const [
        movements,
        setMovements,
    ] = useState<OperatorMovement[]>(
        [],
    )

    const [
        itemForm,
        setItemForm,
    ] = useState(
        emptyItemForm,
    )

    const [
        movementForm,
        setMovementForm,
    ] = useState(
        emptyMovementForm,
    )

    const [
        editingItemId,
        setEditingItemId,
    ] = useState<string | null>(
        null,
    )

    const [
        loading,
        setLoading,
    ] = useState(false)

    const [
        selectedStock,
        setSelectedStock,
    ] = useState<StockItem[]>(
        [],
    )


    const user =
        getCurrentUser()

    const role =
        getCurrentRole()


    const [
        canManageBatchItems,
        setCanManageBatchItems,
    ] = useState(
        role === 'admin' ||
        role === 'client_operator',
    )

    const [
        canMoveStock,
        setCanMoveStock,
    ] = useState(
        role === 'admin' ||
        role === 'warehouse_operator',
    )


    const canManageItems =
        role === 'admin' ||
        role === 'client_operator'

    const isClient =
        role === 'client_operator'


    const {
        confirmAction,
        showAlert,
        showBackendError,
    } = useFeedback()


    /**
     * Prendas que ya pertenecen al lote.
     *
     * Se utilizan para las operaciones
     * de movimiento.
     */
    const batchGarments =
        useMemo(
            () => {

                return items
                    .map(
                        (item) =>
                            item.garment,
                    )
                    .filter(
                        Boolean,
                    ) as Garment[]

            },
            [
                items,
            ],
        )


    /**
     * Item seleccionado en el formulario
     * de movimiento.
     */
    const selectedMovementItem =
        useMemo(
            () => {

                return items.find(
                    (item) =>
                        item.garment_id ===
                        movementForm.garment_id,
                )

            },
            [
                items,
                movementForm.garment_id,
            ],
        )


    const selectedMovementGarment =
        selectedMovementItem
            ?.garment


    /**
     * Stocks que actualmente tienen
     * cantidad disponible.
     */
    const availableOriginStatuses =
        useMemo(
            () => {

                return selectedStock.filter(
                    (stock) =>
                        Number(
                            stock.quantity,
                        ) > 0,
                )

            },
            [
                selectedStock,
            ],
        )


    /**
     * Cantidad sugerida para movimientos.
     */
    const suggestedQuantity =
        selectedMovementItem
            ?.quantity_received
        || 1


    /**
     * Acciones disponibles según
     * el estado actual del lote.
     */
    const getAvailableMovementActions =
        () => {

            const currentBatchStatus =
                batch
                    ?.current_status
                    ?.code


            if (!currentBatchStatus) {
                return []
            }


            if (
                currentBatchStatus ===
                'EN_PROCESO'
            ) {
                return [
                    {
                        label:
                            'Enviar a reproceso',

                        to:
                            'REPROCESO',

                        type:
                            'reproceso',
                    },

                    {
                        label:
                            'Preparar despacho',

                        to:
                            'PREPARADO_DESPACHO',

                        type:
                            'proceso',
                    },
                ]
            }


            if (
                currentBatchStatus ===
                'REPROCESO'
            ) {
                return [
                    {
                        label:
                            'Volver a proceso',

                        to:
                            'EN_PROCESO',

                        type:
                            'proceso',
                    },

                    {
                        label:
                            'Preparar despacho',

                        to:
                            'PREPARADO_DESPACHO',

                        type:
                            'proceso',
                    },
                ]
            }


            if (
                currentBatchStatus ===
                'DERIVADO_EXTERNO'
            ) {
                return [
                    {
                        label:
                            'Enviar a traslado',

                        to:
                            'EN_TRASLADO',

                        type:
                            'retorno',
                    },
                ]
            }


            if (
                currentBatchStatus ===
                'PREPARADO_DESPACHO'
            ) {
                return [
                    {
                        label:
                            'Enviar a traslado',

                        to:
                            'EN_TRASLADO',

                        type:
                            'retorno',
                    },
                ]
            }


            if (
                currentBatchStatus ===
                'EN_TRASLADO'
            ) {
                return [
                    {
                        label:
                            'Retornar cliente',

                        to:
                            'RETORNADO_CLIENTE',

                        type:
                            'retorno',
                    },
                ]
            }


            return []
        }


    /**
     * Sugerencia automática de movimiento
     * según estado del lote.
     */
    const getMovementSuggestionByBatchStatus =
        (
            statusCode?: string,
        ) => {

            switch (
            statusCode
            ) {

                case 'PENDIENTE_RECEPCION':

                    return {
                        fromStatusCode:
                            'PENDIENTE_RECEPCION',

                        toStatusCode:
                            'RECEPCIONADO',

                        movementType:
                            'recepcion',
                    }


                case 'RECEPCIONADO':

                    return {
                        fromStatusCode:
                            'RECEPCIONADO',

                        toStatusCode:
                            'EN_PROCESO',

                        movementType:
                            'proceso',
                    }


                case 'EN_PROCESO':

                    return {
                        fromStatusCode:
                            'EN_PROCESO',

                        toStatusCode:
                            'PREPARADO_DESPACHO',

                        movementType:
                            'proceso',
                    }


                case 'REPROCESO':

                    return {
                        fromStatusCode:
                            'REPROCESO',

                        toStatusCode:
                            'EN_PROCESO',

                        movementType:
                            'reproceso',
                    }


                case 'PREPARADO_DESPACHO':
                case 'DERIVADO_EXTERNO':

                    return {
                        fromStatusCode:
                            statusCode,

                        toStatusCode:
                            'EN_TRASLADO',

                        movementType:
                            'retorno',
                    }


                case 'EN_TRASLADO':

                    return {
                        fromStatusCode:
                            'EN_TRASLADO',

                        toStatusCode:
                            'RETORNADO_CLIENTE',

                        movementType:
                            'retorno',
                    }


                default:

                    return {
                        fromStatusCode:
                            '',

                        toStatusCode:
                            '',

                        movementType:
                            'ajuste',
                    }
            }
        }


    /**
     * NUEVA REGLA:
     *
     * Solo mostramos prendas:
     *
     * 1. activas;
     * 2. pertenecientes al cliente del lote;
     * 3. que todavía no estén agregadas.
     */
    const availableGarments =
        useMemo(
            () => {

                if (!batch) {
                    return []
                }

                return garments.filter(
                    (garment) =>

                        garment.active

                        &&

                        garment.client_id ===
                        batch.client_id

                        &&

                        !items.some(
                            (item) =>
                                item.garment_id ===
                                garment.id,
                        ),
                )

            },
            [
                garments,
                items,
                batch,
            ],
        )


    /**
     * Prenda seleccionada para agregar
     * al lote.
     */
    const selectedItemGarment =
        useMemo(
            () => {

                return garments.find(
                    (garment) =>
                        garment.id ===
                        itemForm.garment_id,
                ) || null

            },
            [
                garments,
                itemForm.garment_id,
            ],
        )


    /**
     * Preview visual del valor.
     *
     * El valor definitivo será calculado
     * por el backend y guardado como
     * unit_value.
     */
    const itemPreviewTotal =
        useMemo(
            () => {

                if (
                    !selectedItemGarment
                ) {
                    return 0
                }

                return (
                    Number(
                        selectedItemGarment.value
                        || 0,
                    )
                    *
                    Number(
                        itemForm.quantity_sent
                        || 0,
                    )
                )

            },
            [
                selectedItemGarment,
                itemForm.quantity_sent,
            ],
        )


    /**
     * Carga completa del detalle.
     *
     * Ya no cargamos procesos.
     */
    const loadData =
        async () => {

            const [
                batchData,
                itemsData,
                garmentsData,
                statusesData,
                movementsData,
            ] = await Promise.all([
                getOperatorBatchById(
                    batchId,
                ),

                getBatchItems(
                    batchId,
                ),

                getGarments(),

                getMovementStatuses(),

                getBatchMovements(
                    batchId,
                ),
            ])


            setBatch(
                batchData,
            )

            setItems(
                itemsData,
            )

            setGarments(
                garmentsData,
            )

            setStatuses(
                statusesData,
            )

            setMovements(
                movementsData,
            )
        }


    /**
     * Cambios formulario de items.
     */
    const handleItemChange =
        (
            field:
                keyof typeof emptyItemForm,

            value:
                string | number,
        ) => {

            setItemForm(
                (prev) => ({
                    ...prev,
                    [field]: value,
                }),
            )
        }


    /**
     * Cambios formulario movimiento.
     */
    const handleMovementChange =
        (
            field:
                keyof typeof emptyMovementForm,

            value:
                string | number,
        ) => {

            setMovementForm(
                (prev) => ({
                    ...prev,
                    [field]: value,
                }),
            )
        }


    /**
     * Crear / actualizar prenda del lote.
     */
    const handleSubmitItem =
        async () => {

            if (
                !itemForm.garment_id
            ) {
                showAlert(
                    'Debe seleccionar una prenda',
                    'warning',
                )

                return
            }


            if (
                itemForm.quantity_sent <= 0
            ) {
                showAlert(
                    'La cantidad enviada debe ser mayor a cero',
                    'warning',
                )

                return
            }


            if (
                !batch
            ) {
                showAlert(
                    'Lote no encontrado',
                    'danger',
                )

                return
            }


            const garment =
                garments.find(
                    (item) =>
                        item.id ===
                        itemForm.garment_id,
                )


            if (
                !garment
            ) {
                showAlert(
                    'Prenda no encontrada',
                    'danger',
                )

                return
            }


            /**
             * Protección frontend adicional.
             *
             * El backend también valida esto.
             */
            if (
                garment.client_id !==
                batch.client_id
            ) {
                showAlert(
                    'La prenda no pertenece al cliente del lote',
                    'danger',
                )

                return
            }


           /*  const confirmed =
                await confirmAction({
                    title:
                        editingItemId
                            ? 'Actualizar prenda del lote'
                            : 'Agregar prenda al lote',

                    message:
                        editingItemId
                            ? 'Se actualizarán los datos de esta prenda.'
                            : 'La prenda será agregada al lote con el precio vigente.',

                    confirmText:
                        editingItemId
                            ? 'Actualizar'
                            : 'Agregar',

                    color:
                        'primary',

                    fields: [
                        {
                            label:
                                'Lote',

                            value:
                                batch.batch_number,
                        },

                        {
                            label:
                                'Cliente',

                            value:
                                batch.client
                                    ?.name,
                        },

                        {
                            label:
                                'Prenda',

                            value:
                                garment.code,
                        },

                        {
                            label:
                                'Nombre',

                            value:
                                garment.size
                                ||
                                garment.description
                                ||
                                '-',
                        },

                        {
                            label:
                                'Cantidad',

                            value:
                                itemForm
                                    .quantity_sent,
                        },

                        {
                            label:
                                editingItemId
                                    ? 'Precio histórico'
                                    : 'Precio vigente',

                            value:
                                editingItemId
                                    ? `$${Number(
                                        items.find(
                                            (item) =>
                                                item.id ===
                                                editingItemId,
                                        )
                                            ?.unit_value
                                        || 0,
                                    ).toLocaleString(
                                        'es-CL',
                                    )}`
                                    : `$${Number(
                                        garment.value
                                        || 0,
                                    ).toLocaleString(
                                        'es-CL',
                                    )}`,
                        },
                    ],
                })


            if (
                !confirmed.confirmed
            ) {
                return
            } */


            try {

                if (
                    editingItemId
                ) {

                    /**
                     * IMPORTANTE:
                     *
                     * No enviamos unit_value.
                     *
                     * El backend conserva el precio
                     * histórico del item.
                     */
                    await updateBatchItem(
                        batchId,
                        editingItemId,
                        {
                            quantity_sent:
                                Number(
                                    itemForm
                                        .quantity_sent,
                                ),

                            quantity_received:
                                Number(
                                    itemForm
                                        .quantity_received,
                                ),

                            notes:
                                itemForm.notes,
                        },
                    )


                    showAlert(
                        'Prenda del lote actualizada correctamente',
                        'success',
                    )

                } else {

                    /**
                     * El backend toma Garment.value
                     * y lo congela en unit_value.
                     */
                    await addBatchItem(
                        batchId,
                        {
                            garment_id:
                                itemForm
                                    .garment_id,

                            quantity_sent:
                                Number(
                                    itemForm
                                        .quantity_sent,
                                ),

                            quantity_received:
                                isClient
                                    ? 0
                                    : Number(
                                        itemForm
                                            .quantity_received,
                                    ),

                            notes:
                                itemForm.notes,
                        },
                    )


                    showAlert(
                        'Prenda agregada al lote correctamente',
                        'success',
                    )
                }


                setItemForm(
                    emptyItemForm,
                )

                setEditingItemId(
                    null,
                )

                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error guardando prenda del lote',
                )
            }
        }


    /**
     * Editar un item existente.
     *
     * El precio NO se carga desde Garment.value.
     * El backend utilizará item.unit_value.
     */
    const handleEditItem =
        (
            item:
                OperatorBatchItem,
        ) => {

            setEditingItemId(
                item.id,
            )


            setItemForm({
                garment_id:
                    item.garment_id,

                quantity_sent:
                    item.quantity_sent,

                quantity_received:
                    item.quantity_received,

                notes:
                    item.notes
                    || '',
            })
        }


    /**
     * Eliminar prenda del lote.
     */
    const handleRemoveItem =
        async (
            itemId: string,
        ) => {

            const item =
                items.find(
                    (item) =>
                        item.id ===
                        itemId,
                )


            if (!item) {
                showAlert(
                    'Prenda no encontrada',
                    'danger',
                )

                return
            }


            const confirmed =
                await confirmAction({
                    title:
                        'Eliminar prenda del lote',

                    message:
                        '¿Seguro que deseas eliminar esta prenda del lote?',

                    confirmText:
                        'Eliminar',

                    color:
                        'danger',

                    fields: [
                        {
                            label:
                                'Código',

                            value:
                                item.garment
                                    ?.code,
                        },

                        {
                            label:
                                'Cantidad',

                            value:
                                item.quantity_sent,
                        },
                    ],
                })


            if (
                !confirmed.confirmed
            ) {
                return
            }


            try {

                await removeBatchItem(
                    batchId,
                    itemId,
                )

                showAlert(
                    'Prenda eliminada correctamente',
                    'success',
                )

                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error eliminando prenda del lote',
                )
            }
        }


    /**
     * Cancelar edición.
     */
    const handleCancelItem =
        () => {

            setItemForm(
                emptyItemForm,
            )

            setEditingItemId(
                null,
            )
        }


    /**
     * Crear movimiento.
     */
    const handleSubmitMovement =
        async () => {

            if (
                !movementForm
                    .garment_id
            ) {
                showAlert(
                    'Debe seleccionar una prenda',
                    'warning',
                )

                return
            }


            if (
                !movementForm
                    .to_status_id
            ) {
                showAlert(
                    'Debe seleccionar estado destino',
                    'warning',
                )

                return
            }


            if (
                Number(
                    movementForm.quantity,
                ) <= 0
            ) {
                showAlert(
                    'La cantidad debe ser mayor a cero',
                    'warning',
                )

                return
            }


            try {

                await createBatchMovement(
                    batchId,
                    {
                        garment_id:
                            movementForm
                                .garment_id,

                        from_status_id:
                            movementForm
                                .from_status_id
                            || null,

                        to_status_id:
                            movementForm
                                .to_status_id,

                        quantity:
                            Number(
                                movementForm
                                    .quantity,
                            ),

                        movement_type:
                            movementForm
                                .movement_type,

                        notes:
                            movementForm
                                .notes,
                    },
                )


                setMovementForm(
                    emptyMovementForm,
                )

                setSelectedStock(
                    [],
                )

                showAlert(
                    'Movimiento registrado correctamente',
                    'success',
                )

                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error registrando movimiento',
                )
            }
        }


    /**
     * Seleccionar una prenda para
     * realizar movimientos.
     */
    const handleSelectMovementGarment =
        async (
            garmentId: string,
        ) => {

            const item =
                items.find(
                    (batchItem) =>
                        batchItem.garment_id ===
                        garmentId,
                )


            if (
                !batch ||
                !garmentId ||
                !item
            ) {

                setSelectedStock(
                    [],
                )

                setMovementForm({
                    ...emptyMovementForm,
                    garment_id:
                        garmentId,
                })

                return
            }


            const stockData =
                await getStock({
                    client_id:
                        batch.client_id,

                    garment_id:
                        garmentId,
                })


            setSelectedStock(
                stockData,
            )


            const suggestion =
                getMovementSuggestionByBatchStatus(
                    batch
                        .current_status
                        ?.code,
                )


            const suggestedFromStatus =
                suggestion
                    .fromStatusCode
                    ? statuses.find(
                        (status) =>
                            status.code ===
                            suggestion
                                .fromStatusCode,
                    )
                    : null


            const suggestedToStatus =
                suggestion
                    .toStatusCode
                    ? statuses.find(
                        (status) =>
                            status.code ===
                            suggestion
                                .toStatusCode,
                    )
                    : null


            const stockForSuggestedOrigin =
                suggestedFromStatus
                    ? stockData.find(
                        (stock) =>
                            stock.status_id ===
                            suggestedFromStatus.id

                            &&

                            Number(
                                stock.quantity,
                            ) > 0,
                    )
                    : null


            setMovementForm({
                garment_id:
                    garmentId,

                from_status_id:
                    stockForSuggestedOrigin
                        ?.status_id
                    ||
                    suggestedFromStatus
                        ?.id
                    ||
                    '',

                to_status_id:
                    suggestedToStatus
                        ?.id
                    ||
                    '',

                quantity:
                    Number(
                        stockForSuggestedOrigin
                            ?.quantity
                        || 0,
                    ) > 0
                        ? Number(
                            stockForSuggestedOrigin
                                ?.quantity,
                        )
                        : Number(
                            item.quantity_received
                            ||
                            item.quantity_sent
                            ||
                            suggestedQuantity
                            ||
                            1,
                        ),

                movement_type:
                    suggestion
                        .movementType,

                notes:
                    `Movimiento de ${item.garment
                        ?.size
                    ||
                    item.garment
                        ?.description
                    ||
                    item.garment
                        ?.code
                    ||
                    'prenda'
                    }`,
            })
        }


    /**
     * Aplicar una acción sugerida
     * al formulario de movimiento.
     */
    const applyMovementAction =
        (
            toStatusCode: string,
            movementType: string,
        ) => {

            const toStatus =
                statuses.find(
                    (status) =>
                        status.code ===
                        toStatusCode,
                )


            if (
                !toStatus
            ) {
                showAlert(
                    `No existe estado ${toStatusCode}`,
                    'warning',
                )

                return
            }


            setMovementForm(
                (prev) => ({
                    ...prev,

                    to_status_id:
                        toStatus.id,

                    movement_type:
                        movementType,
                }),
            )
        }


    /**
     * Despachar lote desde cliente.
     */
    const handleDispatchBatch =
        async () => {

            if (!batch) {
                return
            }


            const details =
                items.map(
                    (item) => ({
                        item:
                            item.garment
                                ?.size
                            ||
                            item.garment
                                ?.description
                            ||
                            item.garment
                                ?.code
                            ||
                            'Artículo sin nombre',

                        quantity:
                            item.quantity_sent,
                    }),
                )


            const confirmed =
                await confirmAction({
                    title:
                        'Despachar lote a planta',

                    message:
                        'Al despachar el lote, ya no podrá ser modificado por el cliente.',

                    confirmText:
                        'Despachar',

                    color:
                        'primary',

                    fields: [
                        {
                            label:
                                'Lote',

                            value:
                                batch
                                    .batch_number,
                        },

                        {
                            label:
                                'Cliente',

                            value:
                                batch
                                    .client
                                    ?.name,
                        },

                        {
                            label:
                                'Estado actual',

                            value:
                                batch
                                    .current_status
                                    ?.name,
                        },
                    ],

                    details,
                })


            if (
                !confirmed.confirmed
            ) {
                return
            }


            try {

                await dispatchClientBatch(
                    batch.id,
                )

                showAlert(
                    'Lote despachado a planta correctamente',
                    'success',
                )

                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error despachando lote',
                )
            }
        }


    /**
     * Carga inicial.
     */
    useEffect(
        () => {

            const load =
                async () => {

                    try {

                        setLoading(
                            true,
                        )

                        await loadData()


                        setCanMoveStock(
                            user
                                ?.role
                                ?.name ===
                            'admin'
                            ||
                            user
                                ?.role
                                ?.name ===
                            'warehouse_operator',
                        )


                        setCanManageBatchItems(
                            user
                                ?.role
                                ?.name ===
                            'admin'
                            ||
                            user
                                ?.role
                                ?.name ===
                            'client_operator',
                        )

                    } finally {

                        setLoading(
                            false,
                        )
                    }
                }


            load()

        },
        [
            batchId,
        ],
    )


    /**
     * Total valorizado del lote.
     *
     * calculated_total ya utiliza
     * el precio histórico congelado
     * por el backend.
     */
    const batchTotal =
        useMemo(
            () => {

                return items.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total
                        +
                        Number(
                            item.calculated_total
                            || 0,
                        ),
                    0,
                )

            },
            [
                items,
            ],
        )


    return (
        <>

            {/*
             * =====================================================
             * DATOS DEL LOTE
             * =====================================================
             */}

            <CCard className="mb-4">

                <CCardHeader>

                    <strong>
                        Detalle de lote
                    </strong>

                </CCardHeader>


                <CCardBody>

                    <CRow>

                        <CCol md={3}>

                            <strong>
                                N° Lote:
                            </strong>

                            <div>
                                {
                                    batch
                                        ?.batch_number
                                    || '-'
                                }
                            </div>

                        </CCol>


                        <CCol md={3}>

                            <strong>
                                Cliente:
                            </strong>

                            <div>
                                {
                                    batch
                                        ?.client
                                        ?.name
                                    || '-'
                                }
                            </div>

                        </CCol>


                        <CCol md={3}>

                            <strong>
                                Estado:
                            </strong>

                            <div>
                                {
                                    batch
                                        ?.current_status
                                        ?.name
                                    || '-'
                                }
                            </div>

                        </CCol>


                        <CCol md={3}>

                            <strong>
                                Creado por:
                            </strong>

                            <div>
                                {
                                    batch
                                        ?.creator
                                        ?.name
                                    || '-'
                                }
                            </div>

                        </CCol>


                        {
                            canManageBatchItems

                            &&

                            batch
                                ?.current_status
                                ?.code ===
                            'BORRADOR_CLIENTE'

                            && (

                                <CCol
                                    md={3}
                                    className="mt-3"
                                >

                                    <CButton
                                        color="success"
                                        onClick={
                                            handleDispatchBatch
                                        }
                                    >

                                        Despachar a planta

                                    </CButton>

                                </CCol>

                            )
                        }

                    </CRow>

                </CCardBody>

            </CCard>


            {/*
             * =====================================================
             * PRENDAS DEL LOTE
             * =====================================================
             */}

            {
                canManageBatchItems
                && (

                    <CCard className="mb-4">

                        <CCardHeader>

                            <strong>
                                Prendas del lote
                            </strong>

                        </CCardHeader>


                        <CCardBody>

                            {
                                batch
                                    ?.current_status
                                    ?.code ===
                                'BORRADOR_CLIENTE'

                                && (

                                    <>

                                        <CRow className="mb-3">

                                            <CCol md={4}>

                                                <CFormSelect
                                                    label="Prenda"
                                                    value={
                                                        itemForm
                                                            .garment_id
                                                    }
                                                    disabled={
                                                        Boolean(
                                                            editingItemId,
                                                        )
                                                    }
                                                    onChange={
                                                        (
                                                            e,
                                                        ) =>
                                                            handleItemChange(
                                                                'garment_id',
                                                                e.target.value,
                                                            )
                                                    }
                                                >

                                                    <option value="">
                                                        Seleccione prenda
                                                    </option>


                                                    {
                                                        editingItemId

                                                        &&

                                                        selectedItemGarment

                                                        && (

                                                            <option
                                                                value={
                                                                    selectedItemGarment.id
                                                                }
                                                            >

                                                                {
                                                                    selectedItemGarment.code
                                                                }
                                                                {' - '}
                                                                {
                                                                    selectedItemGarment.size
                                                                    ||
                                                                    selectedItemGarment.description
                                                                    ||
                                                                    'Sin nombre'
                                                                }

                                                            </option>

                                                        )
                                                    }


                                                    {
                                                        !editingItemId

                                                        &&

                                                        availableGarments.map(
                                                            (
                                                                garment,
                                                            ) => (

                                                                <option
                                                                    key={
                                                                        garment.id
                                                                    }
                                                                    value={
                                                                        garment.id
                                                                    }
                                                                >

                                                                    {
                                                                        garment.code
                                                                    }

                                                                    {' - '}

                                                                    {
                                                                        garment.size
                                                                        ||
                                                                        garment.description
                                                                        ||
                                                                        'Sin nombre'
                                                                    }

                                                                    {' - '}

                                                                    {
                                                                        `$${Number(
                                                                            garment.value
                                                                            || 0,
                                                                        ).toLocaleString(
                                                                            'es-CL',
                                                                        )}`
                                                                    }

                                                                </option>

                                                            ),
                                                        )
                                                    }

                                                </CFormSelect>

                                            </CCol>


                                            <CCol md={2}>

                                                <CFormInput
                                                    label="Cant. enviada"
                                                    type="number"
                                                    min={1}
                                                    value={
                                                        itemForm
                                                            .quantity_sent
                                                    }
                                                    onChange={
                                                        (
                                                            e,
                                                        ) =>
                                                            handleItemChange(
                                                                'quantity_sent',
                                                                Number(
                                                                    e.target.value,
                                                                ),
                                                            )
                                                    }
                                                />

                                            </CCol>


                                            {
                                                !isClient
                                                && (

                                                    <CCol md={2}>

                                                        <CFormInput
                                                            label="Cant. recibida"
                                                            type="number"
                                                            min={0}
                                                            value={
                                                                itemForm
                                                                    .quantity_received
                                                            }
                                                            onChange={
                                                                (
                                                                    e,
                                                                ) =>
                                                                    handleItemChange(
                                                                        'quantity_received',
                                                                        Number(
                                                                            e.target.value,
                                                                        ),
                                                                    )
                                                            }
                                                        />

                                                    </CCol>

                                                )
                                            }


                                            <CCol md={4}>

                                                <CFormTextarea
                                                    label="Notas"
                                                    rows={1}
                                                    value={
                                                        itemForm
                                                            .notes
                                                    }
                                                    onChange={
                                                        (
                                                            e,
                                                        ) =>
                                                            handleItemChange(
                                                                'notes',
                                                                e.target.value,
                                                            )
                                                    }
                                                />

                                            </CCol>

                                        </CRow>


                                        {
                                            selectedItemGarment
                                            && (

                                                <CAlert color="info">

                                                    <strong>
                                                        Prenda:
                                                    </strong>
                                                    {' '}
                                                    {
                                                        selectedItemGarment
                                                            .code
                                                    }

                                                    {' | '}

                                                    <strong>
                                                        Precio vigente:
                                                    </strong>
                                                    {' '}
                                                    $
                                                    {
                                                        Number(
                                                            selectedItemGarment
                                                                .value
                                                            || 0,
                                                        )
                                                            .toLocaleString(
                                                                'es-CL',
                                                            )
                                                    }

                                                    {' | '}

                                                    <strong>
                                                        Total estimado:
                                                    </strong>
                                                    {' '}
                                                    $
                                                    {
                                                        Number(
                                                            itemPreviewTotal,
                                                        )
                                                            .toLocaleString(
                                                                'es-CL',
                                                            )
                                                    }

                                                    {
                                                        editingItemId
                                                        && (

                                                            <>

                                                                <br />

                                                                <small>

                                                                    Al editar,
                                                                    el backend conserva
                                                                    el precio histórico
                                                                    con que esta prenda
                                                                    ingresó al lote.

                                                                </small>

                                                            </>

                                                        )
                                                    }

                                                </CAlert>

                                            )
                                        }


                                        <CRow className="mb-4">

                                            <CCol
                                                md={12}
                                                className="d-flex gap-2"
                                            >

                                                <CButton
                                                    color="primary"
                                                    onClick={
                                                        handleSubmitItem
                                                    }
                                                >

                                                    {
                                                        editingItemId
                                                            ? 'Actualizar prenda'
                                                            : 'Agregar prenda'
                                                    }

                                                </CButton>


                                                {
                                                    editingItemId
                                                    && (

                                                        <CButton
                                                            color="secondary"
                                                            onClick={
                                                                handleCancelItem
                                                            }
                                                        >

                                                            Cancelar

                                                        </CButton>

                                                    )
                                                }

                                            </CCol>

                                        </CRow>

                                    </>

                                )
                            }


                            <div className="mb-3">

                                <strong>
                                    Total valorizado del lote:
                                </strong>

                                {' '}

                                $
                                {
                                    batchTotal
                                        .toLocaleString(
                                            'es-CL',
                                        )
                                }

                            </div>


                            <CTable
                                hover
                                responsive
                            >

                                <CTableHead>

                                    <CTableRow>

                                        <CTableHeaderCell>
                                            Código
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Nombre
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Descripción
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Enviada
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Recibida
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Procesada
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Reproceso
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Retornada
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Valor unit.
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Total
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Notas
                                        </CTableHeaderCell>

                                        <CTableHeaderCell>
                                            Acciones
                                        </CTableHeaderCell>

                                    </CTableRow>

                                </CTableHead>


                                <CTableBody>

                                    {
                                        items.map(
                                            (
                                                item,
                                            ) => (

                                                <CTableRow
                                                    key={
                                                        item.id
                                                    }
                                                >

                                                    <CTableDataCell>

                                                        <strong>
                                                            {
                                                                item.garment
                                                                    ?.code
                                                                || '-'
                                                            }
                                                        </strong>

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        {
                                                            item.garment
                                                                ?.size
                                                            || '-'
                                                        }

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        {
                                                            item.garment
                                                                ?.description
                                                            || '-'
                                                        }

                                                    </CTableDataCell>


                                                    <CTableDataCell>
                                                        {
                                                            item
                                                                .quantity_sent
                                                        }
                                                    </CTableDataCell>


                                                    <CTableDataCell>
                                                        {
                                                            item
                                                                .quantity_received
                                                        }
                                                    </CTableDataCell>


                                                    <CTableDataCell>
                                                        {
                                                            item
                                                                .quantity_processed
                                                        }
                                                    </CTableDataCell>


                                                    <CTableDataCell>
                                                        {
                                                            item
                                                                .quantity_reprocessed
                                                        }
                                                    </CTableDataCell>


                                                    <CTableDataCell>
                                                        {
                                                            item
                                                                .quantity_returned
                                                        }
                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        $
                                                        {
                                                            Number(
                                                                item.unit_value
                                                                || 0,
                                                            )
                                                                .toLocaleString(
                                                                    'es-CL',
                                                                )
                                                        }

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        <strong>

                                                            $
                                                            {
                                                                Number(
                                                                    item.calculated_total
                                                                    || 0,
                                                                )
                                                                    .toLocaleString(
                                                                        'es-CL',
                                                                    )
                                                            }

                                                        </strong>

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        {
                                                            item.notes
                                                            || '-'
                                                        }

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        {
                                                            canManageItems

                                                            &&

                                                            batch
                                                                ?.current_status
                                                                ?.code ===
                                                            'BORRADOR_CLIENTE'

                                                            && (

                                                                <div className="d-flex gap-2">

                                                                    <CButton
                                                                        color="warning"
                                                                        size="sm"
                                                                        onClick={
                                                                            () =>
                                                                                handleEditItem(
                                                                                    item,
                                                                                )
                                                                        }
                                                                    >

                                                                        Editar

                                                                    </CButton>


                                                                    <CButton
                                                                        color="danger"
                                                                        size="sm"
                                                                        onClick={
                                                                            () =>
                                                                                handleRemoveItem(
                                                                                    item.id,
                                                                                )
                                                                        }
                                                                    >

                                                                        Eliminar

                                                                    </CButton>

                                                                </div>

                                                            )
                                                        }

                                                    </CTableDataCell>

                                                </CTableRow>

                                            ),
                                        )
                                    }


                                    {
                                        items.length ===
                                        0
                                        && (

                                            <CTableRow>

                                                <CTableDataCell
                                                    colSpan={
                                                        12
                                                    }
                                                    className="text-center"
                                                >

                                                    No hay prendas agregadas al lote

                                                </CTableDataCell>

                                            </CTableRow>

                                        )
                                    }

                                </CTableBody>

                            </CTable>

                        </CCardBody>

                    </CCard>

                )
            }


            {/*
             * =====================================================
             * MOVIMIENTOS
             * =====================================================
             */}

            {
                canMoveStock
                && (

                    <>

                        <CCard className="mb-4">

                            <CCardHeader>

                                <strong>
                                    Registrar movimiento
                                </strong>

                            </CCardHeader>


                            <CCardBody>

                                <CRow className="mb-3">

                                    <CCol md={3}>

                                        <CFormSelect
                                            label="Prenda"
                                            value={
                                                movementForm
                                                    .garment_id
                                            }
                                            onChange={
                                                (
                                                    e,
                                                ) =>
                                                    handleSelectMovementGarment(
                                                        e.target.value,
                                                    )
                                            }
                                        >

                                            <option value="">
                                                Seleccione prenda
                                            </option>


                                            {
                                                batchGarments.map(
                                                    (
                                                        garment,
                                                    ) => (

                                                        <option
                                                            key={
                                                                garment.id
                                                            }
                                                            value={
                                                                garment.id
                                                            }
                                                        >

                                                            {
                                                                garment.code
                                                            }

                                                            {' - '}

                                                            {
                                                                garment.size
                                                                ||
                                                                garment.description
                                                                ||
                                                                'Sin nombre'
                                                            }

                                                        </option>

                                                    ),
                                                )
                                            }

                                        </CFormSelect>

                                    </CCol>


                                    <CCol md={3}>

                                        <CFormSelect
                                            label="Estado origen"
                                            value={
                                                movementForm
                                                    .from_status_id
                                            }
                                            onChange={
                                                (
                                                    e,
                                                ) =>
                                                    handleMovementChange(
                                                        'from_status_id',
                                                        e.target.value,
                                                    )
                                            }
                                        >

                                            <option value="">
                                                Sin origen / ingreso inicial
                                            </option>


                                            {
                                                statuses
                                                    .filter(
                                                        (
                                                            status,
                                                        ) => {

                                                            if (
                                                                status.id ===
                                                                movementForm
                                                                    .from_status_id
                                                            ) {
                                                                return true
                                                            }

                                                            return availableOriginStatuses.some(
                                                                (
                                                                    stock,
                                                                ) =>
                                                                    stock.status_id ===
                                                                    status.id,
                                                            )
                                                        },
                                                    )
                                                    .map(
                                                        (
                                                            status,
                                                        ) => {

                                                            const stock =
                                                                availableOriginStatuses.find(
                                                                    (
                                                                        item,
                                                                    ) =>
                                                                        item.status_id ===
                                                                        status.id,
                                                                )


                                                            return (

                                                                <option
                                                                    key={
                                                                        status.id
                                                                    }
                                                                    value={
                                                                        status.id
                                                                    }
                                                                >

                                                                    {
                                                                        status.name
                                                                    }

                                                                    {
                                                                        stock
                                                                            ? ` - Disponible: ${stock.quantity}`
                                                                            : ' - Estado sugerido'
                                                                    }

                                                                </option>

                                                            )
                                                        },
                                                    )
                                            }

                                        </CFormSelect>

                                    </CCol>


                                    <CCol md={3}>

                                        <CFormSelect
                                            label="Estado destino"
                                            value={
                                                movementForm
                                                    .to_status_id
                                            }
                                            onChange={
                                                (
                                                    e,
                                                ) =>
                                                    handleMovementChange(
                                                        'to_status_id',
                                                        e.target.value,
                                                    )
                                            }
                                        >

                                            <option value="">
                                                Seleccione destino
                                            </option>


                                            {
                                                statuses.map(
                                                    (
                                                        status,
                                                    ) => (

                                                        <option
                                                            key={
                                                                status.id
                                                            }
                                                            value={
                                                                status.id
                                                            }
                                                        >

                                                            {
                                                                status.name
                                                            }

                                                        </option>

                                                    ),
                                                )
                                            }

                                        </CFormSelect>

                                    </CCol>


                                    <CCol md={3}>

                                        <CFormSelect
                                            label="Tipo movimiento"
                                            value={
                                                movementForm
                                                    .movement_type
                                            }
                                            onChange={
                                                (
                                                    e,
                                                ) =>
                                                    handleMovementChange(
                                                        'movement_type',
                                                        e.target.value,
                                                    )
                                            }
                                        >

                                            <option value="recepcion">
                                                Recepción
                                            </option>

                                            <option value="proceso">
                                                Proceso
                                            </option>

                                            <option value="reproceso">
                                                Reproceso
                                            </option>

                                            <option value="retorno">
                                                Retorno
                                            </option>

                                            <option value="ajuste">
                                                Ajuste
                                            </option>

                                        </CFormSelect>

                                    </CCol>

                                </CRow>


                                {
                                    selectedMovementItem
                                    && (

                                        <CAlert
                                            color="info"
                                            className="mt-3"
                                        >

                                            <strong>
                                                Prenda seleccionada:
                                            </strong>

                                            {' '}

                                            {
                                                selectedMovementGarment
                                                    ?.code
                                            }

                                            {' - '}

                                            {
                                                selectedMovementGarment
                                                    ?.size
                                                ||
                                                selectedMovementGarment
                                                    ?.description
                                                ||
                                                '-'
                                            }

                                            <br />


                                            <strong>
                                                Valor histórico unitario:
                                            </strong>

                                            {' '}

                                            $
                                            {
                                                Number(
                                                    selectedMovementItem
                                                        .unit_value
                                                    || 0,
                                                )
                                                    .toLocaleString(
                                                        'es-CL',
                                                    )
                                            }

                                            {' | '}

                                            <strong>
                                                Valor línea:
                                            </strong>

                                            {' '}

                                            $
                                            {
                                                Number(
                                                    selectedMovementItem
                                                        .calculated_total
                                                    || 0,
                                                )
                                                    .toLocaleString(
                                                        'es-CL',
                                                    )
                                            }

                                            <br />


                                            <strong>
                                                Enviada:
                                            </strong>
                                            {' '}
                                            {
                                                selectedMovementItem
                                                    .quantity_sent
                                            }

                                            {' | '}

                                            <strong>
                                                Recibida:
                                            </strong>
                                            {' '}
                                            {
                                                selectedMovementItem
                                                    .quantity_received
                                            }

                                            {' | '}

                                            <strong>
                                                Procesada:
                                            </strong>
                                            {' '}
                                            {
                                                selectedMovementItem
                                                    .quantity_processed
                                            }

                                            {' | '}

                                            <strong>
                                                Reproceso:
                                            </strong>
                                            {' '}
                                            {
                                                selectedMovementItem
                                                    .quantity_reprocessed
                                            }

                                            {' | '}

                                            <strong>
                                                Retornada:
                                            </strong>
                                            {' '}
                                            {
                                                selectedMovementItem
                                                    .quantity_returned
                                            }

                                        </CAlert>

                                    )
                                }


                                {
                                    movementForm
                                        .garment_id
                                    && (

                                        <div className="mb-3">

                                            <strong>
                                                Stock actual de la prenda:
                                            </strong>


                                            <div className="d-flex gap-2 flex-wrap mt-2">

                                                {
                                                    availableOriginStatuses
                                                        .length > 0

                                                        ? (

                                                            availableOriginStatuses.map(
                                                                (
                                                                    stock,
                                                                ) => (

                                                                    <CBadge
                                                                        color="secondary"
                                                                        key={
                                                                            stock.id
                                                                        }
                                                                    >

                                                                        {
                                                                            stock.status
                                                                                ?.name
                                                                        }
                                                                        :
                                                                        {' '}
                                                                        {
                                                                            stock.quantity
                                                                        }

                                                                    </CBadge>

                                                                ),
                                                            )

                                                        )

                                                        : (

                                                            <CBadge color="warning">

                                                                Sin stock registrado

                                                            </CBadge>

                                                        )
                                                }

                                            </div>

                                        </div>

                                    )
                                }


                                {
                                    movementForm
                                        .garment_id

                                    &&

                                    getAvailableMovementActions()
                                        .length > 0

                                    && (

                                        <div className="mb-3">

                                            <strong>
                                                Acciones disponibles:
                                            </strong>


                                            <div className="d-flex gap-2 flex-wrap mt-2">

                                                {
                                                    getAvailableMovementActions()
                                                        .map(
                                                            (
                                                                action,
                                                            ) => (

                                                                <CButton
                                                                    key={
                                                                        action.to
                                                                    }
                                                                    color="primary"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={
                                                                        () =>
                                                                            applyMovementAction(
                                                                                action.to,
                                                                                action.type,
                                                                            )
                                                                    }
                                                                >

                                                                    {
                                                                        action.label
                                                                    }

                                                                </CButton>

                                                            ),
                                                        )
                                                }

                                            </div>

                                        </div>

                                    )
                                }


                                <CRow className="mb-4">

                                    <CCol md={2}>

                                        <CFormInput
                                            label="Cantidad"
                                            type="number"
                                            min={1}
                                            value={
                                                movementForm
                                                    .quantity
                                            }
                                            onChange={
                                                (
                                                    e,
                                                ) =>
                                                    handleMovementChange(
                                                        'quantity',
                                                        Number(
                                                            e.target.value,
                                                        ),
                                                    )
                                            }
                                        />

                                    </CCol>


                                    <CCol md={8}>

                                        <CFormTextarea
                                            label="Notas"
                                            rows={1}
                                            value={
                                                movementForm
                                                    .notes
                                            }
                                            onChange={
                                                (
                                                    e,
                                                ) =>
                                                    handleMovementChange(
                                                        'notes',
                                                        e.target.value,
                                                    )
                                            }
                                        />

                                    </CCol>


                                    <CCol
                                        md={2}
                                        className="d-flex align-items-end"
                                    >

                                        <CButton
                                            color="primary"
                                            onClick={
                                                handleSubmitMovement
                                            }
                                        >

                                            Registrar

                                        </CButton>

                                    </CCol>

                                </CRow>

                            </CCardBody>

                        </CCard>


                        {/*
                         * =====================================================
                         * HISTORIAL
                         * =====================================================
                         */}

                        <CCard>

                            <CCardHeader>

                                <strong>
                                    Historial de movimientos
                                </strong>

                            </CCardHeader>


                            <CCardBody>

                                <CTable
                                    hover
                                    responsive
                                >

                                    <CTableHead>

                                        <CTableRow>

                                            <CTableHeaderCell>
                                                Fecha
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Prenda
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Desde
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Hacia
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Cantidad
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Tipo
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Usuario
                                            </CTableHeaderCell>

                                            <CTableHeaderCell>
                                                Notas
                                            </CTableHeaderCell>

                                        </CTableRow>

                                    </CTableHead>


                                    <CTableBody>

                                        {
                                            movements.map(
                                                (
                                                    movement,
                                                ) => (

                                                    <CTableRow
                                                        key={
                                                            movement.id
                                                        }
                                                    >

                                                        <CTableDataCell>

                                                            {
                                                                new Date(
                                                                    movement.createdAt,
                                                                )
                                                                    .toLocaleString(
                                                                        'es-CL',
                                                                    )
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement
                                                                    .garment
                                                                    ?.code
                                                                || '-'
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement
                                                                    .from_status
                                                                    ?.name
                                                                ||
                                                                'Ingreso inicial'
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement
                                                                    .to_status
                                                                    ?.name
                                                                || '-'
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement.quantity
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement
                                                                    .movement_type
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement
                                                                    .creator
                                                                    ?.name
                                                                || '-'
                                                            }

                                                        </CTableDataCell>


                                                        <CTableDataCell>

                                                            {
                                                                movement.notes
                                                                || '-'
                                                            }

                                                        </CTableDataCell>

                                                    </CTableRow>

                                                ),
                                            )
                                        }


                                        {
                                            movements.length ===
                                            0
                                            && (

                                                <CTableRow>

                                                    <CTableDataCell
                                                        colSpan={
                                                            8
                                                        }
                                                        className="text-center"
                                                    >

                                                        No hay movimientos registrados

                                                    </CTableDataCell>

                                                </CTableRow>

                                            )
                                        }

                                    </CTableBody>

                                </CTable>

                            </CCardBody>

                        </CCard>

                    </>

                )
            }

        </>
    )
}


export default OperatorBatchDetail
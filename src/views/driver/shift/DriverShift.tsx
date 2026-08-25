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
    CFormCheck,
    CFormInput,
    CFormSelect,
    CFormTextarea,
    CRow,
    CSpinner,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import {
    downloadDriverShiftTicket,
    finishDriverShift,
    getActiveVehicles,
    getCurrentDriverShift,
    getDriverChecklist,
    getDriverShiftHistory,
    startDriverShift,
    type DriverChecklistDefinition,
    type DriverShift,
    type Vehicle,
} from '../../../services/driverShift.service'

import {
    getCurrentUser,
} from '../../../services/auth.service'

import {
    useFeedback,
} from '../../../context/FeedbackContext'


type ChecklistState = {
    code: string
    checked: boolean
    observations: string
}


const DriverShiftView = () => {

    const [
        vehicles,
        setVehicles,
    ] = useState<Vehicle[]>([])

    const [
        checklistDefinitions,
        setChecklistDefinitions,
    ] = useState<DriverChecklistDefinition[]>([])

    const [
        checklist,
        setChecklist,
    ] = useState<ChecklistState[]>([])

    const [
        currentShift,
        setCurrentShift,
    ] = useState<DriverShift | null>(null)

    const [
        history,
        setHistory,
    ] = useState<DriverShift[]>([])

    const [
        selectedVehicleId,
        setSelectedVehicleId,
    ] = useState('')

    const [
        initialMileage,
        setInitialMileage,
    ] = useState(0)

    const [
        startObservations,
        setStartObservations,
    ] = useState('')

    const [
        finalMileage,
        setFinalMileage,
    ] = useState(0)

    const [
        endObservations,
        setEndObservations,
    ] = useState('')

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        submitting,
        setSubmitting,
    ] = useState(false)

    const [
        downloading,
        setDownloading,
    ] = useState(false)


    const user =
        getCurrentUser()


    const {
        confirmAction,
        showAlert,
        showBackendError,
    } = useFeedback()


    /**
     * Vehículo actualmente seleccionado.
     */
    const selectedVehicle =
        useMemo(
            () =>
                vehicles.find(
                    (vehicle) =>
                        vehicle.id ===
                        selectedVehicleId,
                ) || null,
            [
                vehicles,
                selectedVehicleId,
            ],
        )


    /**
     * Checklist separado por categoría.
     */
    const vehicleChecklist =
        useMemo(
            () =>
                checklistDefinitions.filter(
                    (item) =>
                        item.category ===
                        'vehicle',
                ),
            [
                checklistDefinitions,
            ],
        )


    const driverChecklist =
        useMemo(
            () =>
                checklistDefinitions.filter(
                    (item) =>
                        item.category ===
                        'driver',
                ),
            [
                checklistDefinitions,
            ],
        )


    /**
     * Verifica que todos los checks
     * obligatorios estén aprobados.
     */
    const requiredChecklistComplete =
        useMemo(
            () => {

                const requiredItems =
                    checklistDefinitions.filter(
                        (item) =>
                            item.required,
                    )


                return requiredItems.every(
                    (definition) => {

                        const current =
                            checklist.find(
                                (item) =>
                                    item.code ===
                                    definition.code,
                            )


                        return current?.checked === true
                    },
                )

            },
            [
                checklistDefinitions,
                checklist,
            ],
        )


    /**
     * Kilómetros recorridos.
     *
     * Solo se muestra al finalizar.
     */
    const travelledKilometers =
        useMemo(
            () => {

                if (
                    !currentShift
                    ||
                    finalMileage <= 0
                ) {
                    return 0
                }


                return Math.max(
                    0,
                    Number(finalMileage)
                    -
                    Number(currentShift.initial_mileage),
                )

            },
            [
                currentShift,
                finalMileage,
            ],
        )


    /**
     * Inicializa las respuestas del checklist
     * desde la definición entregada por backend.
     */
    const initializeChecklist =
        (
            definitions:
                DriverChecklistDefinition[],
        ) => {

            setChecklist(
                definitions.map(
                    (definition) => ({
                        code:
                            definition.code,

                        checked:
                            false,

                        observations:
                            '',
                    }),
                ),
            )
        }


    /**
     * Carga inicial del módulo.
     */
    const loadData =
        async () => {

            try {

                setLoading(true)


                const [
                    vehiclesData,
                    checklistData,
                    shiftData,
                    historyData,
                ] = await Promise.all([
                    getActiveVehicles(),
                    getDriverChecklist(),
                    getCurrentDriverShift(),
                    getDriverShiftHistory(),
                ])


                setVehicles(
                    vehiclesData,
                )

                setChecklistDefinitions(
                    checklistData,
                )

                setCurrentShift(
                    shiftData,
                )

                setHistory(
                    historyData,
                )


                /**
                 * Solamente reiniciamos el checklist
                 * si no existe jornada activa.
                 */
                if (!shiftData) {
                    initializeChecklist(
                        checklistData,
                    )
                }


                /**
                 * Si existe jornada activa dejamos
                 * preparado el kilometraje final
                 * con el inicial como mínimo lógico.
                 */
                if (shiftData) {
                    setFinalMileage(
                        Number(
                            shiftData.initial_mileage,
                        ),
                    )
                }

            } catch (error) {

                showBackendError(
                    error,
                    'Error cargando jornada',
                )

            } finally {

                setLoading(false)
            }
        }


    /**
     * Modificar un check.
     */
    const handleChecklistChange =
        (
            code: string,
            checked: boolean,
        ) => {

            setChecklist(
                (previous) =>
                    previous.map(
                        (item) =>
                            item.code === code
                                ? {
                                    ...item,
                                    checked,
                                }
                                : item,
                    ),
            )
        }


    /**
     * Observación específica de un check.
     */
    const handleChecklistObservation =
        (
            code: string,
            observations: string,
        ) => {

            setChecklist(
                (previous) =>
                    previous.map(
                        (item) =>
                            item.code === code
                                ? {
                                    ...item,
                                    observations,
                                }
                                : item,
                    ),
            )
        }


    /**
     * Obtener estado local de un check.
     */
    const getChecklistState =
        (
            code: string,
        ) => {

            return checklist.find(
                (item) =>
                    item.code === code,
            )
        }


    /**
     * Iniciar jornada.
     */
    const handleStartShift =
        async () => {

            if (
                !selectedVehicleId
            ) {

                showAlert(
                    'Debe seleccionar un vehículo',
                    'warning',
                )

                return
            }


            if (
                !Number.isInteger(
                    Number(initialMileage),
                )
                ||
                Number(initialMileage) < 0
            ) {

                showAlert(
                    'Ingrese un kilometraje inicial válido',
                    'warning',
                )

                return
            }


            if (
                !requiredChecklistComplete
            ) {

                showAlert(
                    'Debe aprobar todos los controles obligatorios antes de iniciar la jornada',
                    'warning',
                )

                return
            }


            if (
                !selectedVehicle
            ) {

                showAlert(
                    'Vehículo no encontrado',
                    'danger',
                )

                return
            }


            const failedOptionalChecks =
                checklistDefinitions.filter(
                    (definition) => {

                        if (
                            definition.required
                        ) {
                            return false
                        }


                        return (
                            getChecklistState(
                                definition.code,
                            )?.checked !== true
                        )
                    },
                )


            const fields: {
                label: string
                value: any
            }[] = [
                    {
                        label:
                            'Transportista',

                        value:
                            user?.name || '-',
                    },

                    {
                        label:
                            'Vehículo',

                        value:
                            `${selectedVehicle.plate} - ${selectedVehicle.brand || ''} ${selectedVehicle.model || ''}`.trim(),
                    },

                    {
                        label:
                            'Kilometraje inicial',

                        value:
                            `${Number(
                                initialMileage,
                            ).toLocaleString(
                                'es-CL',
                            )} km`,
                    },

                    {
                        label:
                            'Controles obligatorios',

                        value:
                            'Completados',
                    },
                ]


            if (
                failedOptionalChecks.length >
                0
            ) {

                fields.push({
                    label:
                        'Observaciones de checklist',

                    value:
                        `${failedOptionalChecks.length} control(es) no marcados como OK`,
                })
            }


            const confirmed =
                await confirmAction({
                    title:
                        'Iniciar jornada',

                    message:
                        'Confirma los datos antes de iniciar tu jornada.',

                    confirmText:
                        'Iniciar jornada',

                    color:
                        'success',

                    fields,
                })


            if (!confirmed.confirmed) {
                return
            }


            try {

                setSubmitting(true)


                const shift =
                    await startDriverShift({
                        vehicle_id:
                            selectedVehicleId,

                        initial_mileage:
                            Number(
                                initialMileage,
                            ),

                        observations:
                            startObservations,

                        checklist:
                            checklist.map(
                                (item) => ({
                                    code:
                                        item.code,

                                    checked:
                                        item.checked,

                                    observations:
                                        item.observations,
                                }),
                            ),
                    })


                setCurrentShift(
                    shift,
                )


                setFinalMileage(
                    Number(
                        shift.initial_mileage,
                    ),
                )


                setEndObservations(
                    '',
                )


                showAlert(
                    'Jornada iniciada correctamente',
                    'success',
                )


                /**
                 * Actualizamos historial.
                 */
                const historyData =
                    await getDriverShiftHistory()


                setHistory(
                    historyData,
                )

            } catch (error) {

                showBackendError(
                    error,
                    'Error iniciando jornada',
                )

            } finally {

                setSubmitting(false)
            }
        }


    /**
     * Descargar comprobante.
     */
    const handleDownloadTicket =
        async () => {

            if (!currentShift) {
                return
            }


            try {

                setDownloading(true)


                await downloadDriverShiftTicket(
                    currentShift.id,
                    currentShift.ticket_number,
                )

            } catch (error) {

                showBackendError(
                    error,
                    'Error descargando comprobante',
                )

            } finally {

                setDownloading(false)
            }
        }


    /**
     * Finalizar jornada.
     */
    const handleFinishShift =
        async () => {

            if (!currentShift) {
                return
            }


            const parsedFinalMileage =
                Number(
                    finalMileage,
                )


            if (
                !Number.isInteger(
                    parsedFinalMileage,
                )
            ) {

                showAlert(
                    'El kilometraje final debe ser un número entero',
                    'warning',
                )

                return
            }


            if (
                parsedFinalMileage <
                Number(
                    currentShift.initial_mileage,
                )
            ) {

                showAlert(
                    'El kilometraje final no puede ser menor al kilometraje inicial',
                    'warning',
                )

                return
            }


            const confirmed =
                await confirmAction({
                    title:
                        'Finalizar jornada',

                    message:
                        'Confirma los datos de cierre de jornada.',

                    confirmText:
                        'Finalizar jornada',

                    color:
                        'danger',

                    fields: [
                        {
                            label:
                                'Ticket',

                            value:
                                currentShift.ticket_number,
                        },

                        {
                            label:
                                'Vehículo',

                            value:
                                currentShift.vehicle
                                    ? `${currentShift.vehicle.plate} - ${currentShift.vehicle.brand || ''} ${currentShift.vehicle.model || ''}`.trim()
                                    : '-',
                        },

                        {
                            label:
                                'Km inicial',

                            value:
                                `${Number(
                                    currentShift.initial_mileage,
                                ).toLocaleString(
                                    'es-CL',
                                )} km`,
                        },

                        {
                            label:
                                'Km final',

                            value:
                                `${parsedFinalMileage.toLocaleString(
                                    'es-CL',
                                )} km`,
                        },

                        {
                            label:
                                'Recorrido',

                            value:
                                `${travelledKilometers.toLocaleString(
                                    'es-CL',
                                )} km`,
                        },
                    ],
                })


            if (!confirmed.confirmed) {
                return
            }


            try {

                setSubmitting(true)


                await finishDriverShift({
                    final_mileage:
                        parsedFinalMileage,

                    observations:
                        endObservations,
                })


                showAlert(
                    'Jornada finalizada correctamente',
                    'success',
                )


                /**
                 * Limpiamos estado de la jornada.
                 */
                setCurrentShift(
                    null,
                )

                setSelectedVehicleId(
                    '',
                )

                setInitialMileage(
                    0,
                )

                setFinalMileage(
                    0,
                )

                setStartObservations(
                    '',
                )

                setEndObservations(
                    '',
                )


                initializeChecklist(
                    checklistDefinitions,
                )


                const historyData =
                    await getDriverShiftHistory()


                setHistory(
                    historyData,
                )

            } catch (error) {

                showBackendError(
                    error,
                    'Error finalizando jornada',
                )

            } finally {

                setSubmitting(false)
            }
        }


    useEffect(
        () => {

            loadData()

        },
        [],
    )


    /**
     * Pantalla de carga.
     */
    if (loading) {

        return (

            <div className="d-flex justify-content-center align-items-center py-5">

                <CSpinner />

                <span className="ms-3">
                    Cargando jornada...
                </span>

            </div>
        )
    }


    /**
     * =====================================================
     * JORNADA ACTIVA
     * =====================================================
     */

    if (currentShift) {

        return (

            <>

                <CCard className="mb-4">

                    <CCardHeader>

                        <div className="d-flex justify-content-between align-items-center">

                            <strong>
                                Jornada activa
                            </strong>


                            <CBadge color="success">

                                EN CURSO

                            </CBadge>

                        </div>

                    </CCardHeader>


                    <CCardBody>

                        <CAlert color="success">

                            Jornada iniciada correctamente.

                            <br />

                            <strong>
                                Ticket:
                            </strong>

                            {' '}

                            {
                                currentShift.ticket_number
                            }

                        </CAlert>


                        <CRow className="mb-4">

                            <CCol md={3}>

                                <strong>
                                    Transportista
                                </strong>

                                <div>
                                    {
                                        currentShift
                                            .driver
                                            ?.name
                                        ||
                                        user?.name
                                        ||
                                        '-'
                                    }
                                </div>

                            </CCol>


                            <CCol md={3}>

                                <strong>
                                    Vehículo
                                </strong>

                                <div>

                                    {
                                        currentShift
                                            .vehicle
                                            ?.plate
                                        ||
                                        '-'
                                    }

                                </div>

                                <small className="text-body-secondary">

                                    {
                                        currentShift
                                            .vehicle
                                            ?.brand
                                        ||
                                        ''
                                    }

                                    {' '}

                                    {
                                        currentShift
                                            .vehicle
                                            ?.model
                                        ||
                                        ''
                                    }

                                </small>

                            </CCol>


                            <CCol md={3}>

                                <strong>
                                    Inicio
                                </strong>

                                <div>

                                    {
                                        new Date(
                                            currentShift.started_at,
                                        )
                                            .toLocaleString(
                                                'es-CL',
                                            )
                                    }

                                </div>

                            </CCol>


                            <CCol md={3}>

                                <strong>
                                    Kilometraje inicial
                                </strong>

                                <div>

                                    {
                                        Number(
                                            currentShift.initial_mileage,
                                        )
                                            .toLocaleString(
                                                'es-CL',
                                            )
                                    }

                                    {' km'}

                                </div>

                            </CCol>

                        </CRow>


                        {
                            currentShift
                                .start_observations
                            && (

                                <CAlert color="info">

                                    <strong>
                                        Observaciones iniciales:
                                    </strong>

                                    {' '}

                                    {
                                        currentShift
                                            .start_observations
                                    }

                                </CAlert>

                            )
                        }


                        <div className="d-flex gap-2 mb-4">

                            <CButton
                                color="primary"
                                onClick={
                                    handleDownloadTicket
                                }
                                disabled={
                                    downloading
                                }
                            >

                                {
                                    downloading
                                        ? 'Descargando...'
                                        : 'Descargar comprobante PDF'
                                }

                            </CButton>

                        </div>

                    </CCardBody>

                </CCard>


                {/*
         * CHECKLIST REALIZADO
         */}

                <CCard className="mb-4">

                    <CCardHeader>

                        <strong>
                            Checklist de inicio
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
                                        Categoría
                                    </CTableHeaderCell>

                                    <CTableHeaderCell>
                                        Control
                                    </CTableHeaderCell>

                                    <CTableHeaderCell>
                                        Estado
                                    </CTableHeaderCell>

                                    <CTableHeaderCell>
                                        Observación
                                    </CTableHeaderCell>

                                </CTableRow>

                            </CTableHead>


                            <CTableBody>

                                {
                                    currentShift
                                        .checks
                                        ?.map(
                                            (check) => (

                                                <CTableRow
                                                    key={
                                                        check.id
                                                    }
                                                >

                                                    <CTableDataCell>

                                                        {
                                                            check.category ===
                                                                'vehicle'
                                                                ? 'Vehículo'
                                                                : 'Conductor'
                                                        }

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        {
                                                            check.label
                                                        }

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        <CBadge
                                                            color={
                                                                check.checked
                                                                    ? 'success'
                                                                    : 'warning'
                                                            }
                                                        >

                                                            {
                                                                check.checked
                                                                    ? 'OK'
                                                                    : 'OBSERVADO'
                                                            }

                                                        </CBadge>

                                                    </CTableDataCell>


                                                    <CTableDataCell>

                                                        {
                                                            check.observations
                                                            || '-'
                                                        }

                                                    </CTableDataCell>

                                                </CTableRow>

                                            ),
                                        )
                                }

                            </CTableBody>

                        </CTable>

                    </CCardBody>

                </CCard>


                {/*
         * CIERRE DE JORNADA
         */}

                <CCard className="mb-4">

                    <CCardHeader>

                        <strong>
                            Finalizar jornada
                        </strong>

                    </CCardHeader>


                    <CCardBody>

                        <CRow className="mb-3">

                            <CCol md={4}>

                                <CFormInput
                                    label="Kilometraje inicial"
                                    value={
                                        currentShift
                                            .initial_mileage
                                    }
                                    readOnly
                                />

                            </CCol>


                            <CCol md={4}>

                                <CFormInput
                                    label="Kilometraje final"
                                    type="number"
                                    min={
                                        currentShift
                                            .initial_mileage
                                    }
                                    value={
                                        finalMileage
                                    }
                                    onChange={
                                        (e) =>
                                            setFinalMileage(
                                                Number(
                                                    e.target.value,
                                                ),
                                            )
                                    }
                                />

                            </CCol>


                            <CCol md={4}>

                                <CFormInput
                                    label="Kilómetros recorridos"
                                    value={
                                        travelledKilometers
                                    }
                                    readOnly
                                />

                            </CCol>

                        </CRow>


                        <CRow className="mb-4">

                            <CCol md={12}>

                                <CFormTextarea
                                    label="Observaciones de cierre"
                                    rows={3}
                                    value={
                                        endObservations
                                    }
                                    onChange={
                                        (e) =>
                                            setEndObservations(
                                                e.target.value,
                                            )
                                    }
                                    placeholder="Novedades, daños, incidencias o comentarios de la jornada"
                                />

                            </CCol>

                        </CRow>


                        <CButton
                            color="danger"
                            onClick={
                                handleFinishShift
                            }
                            disabled={
                                submitting
                            }
                        >

                            {
                                submitting
                                    ? 'Finalizando...'
                                    : 'Finalizar jornada'
                            }

                        </CButton>

                    </CCardBody>

                </CCard>


                <ShiftHistory
                    history={
                        history
                    }
                />

            </>
        )
    }


    /**
     * =====================================================
     * SIN JORNADA ACTIVA
     * =====================================================
     */

    return (

        <>

            <CCard className="mb-4">

                <CCardHeader>

                    <strong>
                        Inicio de jornada
                    </strong>

                </CCardHeader>


                <CCardBody>

                    <CAlert color="info">

                        Hola

                        {' '}

                        <strong>
                            {
                                user?.name
                                || 'transportista'
                            }
                        </strong>.

                        {' '}

                        Antes de iniciar debes seleccionar el vehículo y completar el checklist.

                    </CAlert>


                    <CRow className="mb-4">

                        <CCol md={5}>

                            <CFormSelect
                                label="Vehículo"
                                value={
                                    selectedVehicleId
                                }
                                onChange={
                                    (e) =>
                                        setSelectedVehicleId(
                                            e.target.value,
                                        )
                                }
                            >

                                <option value="">
                                    Seleccione vehículo
                                </option>


                                {
                                    vehicles.map(
                                        (vehicle) => (

                                            <option
                                                key={
                                                    vehicle.id
                                                }
                                                value={
                                                    vehicle.id
                                                }
                                            >

                                                {
                                                    vehicle.plate
                                                }

                                                {' - '}

                                                {
                                                    vehicle.brand
                                                    || 'Sin marca'
                                                }

                                                {' '}

                                                {
                                                    vehicle.model
                                                    || ''
                                                }

                                            </option>

                                        ),
                                    )
                                }

                            </CFormSelect>

                        </CCol>


                        <CCol md={3}>

                            <CFormInput
                                label="Patente"
                                value={
                                    selectedVehicle
                                        ?.plate
                                    || ''
                                }
                                readOnly
                            />

                        </CCol>


                        <CCol md={4}>

                            <CFormInput
                                label="Kilometraje inicial"
                                type="number"
                                min={0}
                                value={
                                    initialMileage
                                }
                                onChange={
                                    (e) =>
                                        setInitialMileage(
                                            Number(
                                                e.target.value,
                                            ),
                                        )
                                }
                            />

                        </CCol>

                    </CRow>


                    {
                        vehicles.length ===
                        0
                        && (

                            <CAlert color="warning">

                                No existen vehículos activos disponibles.

                            </CAlert>

                        )
                    }

                </CCardBody>

            </CCard>


            {/*
       * CHECKLIST VEHÍCULO
       */}

            <ChecklistCard
                title="Condiciones del vehículo"
                definitions={
                    vehicleChecklist
                }
                checklist={
                    checklist
                }
                onCheckChange={
                    handleChecklistChange
                }
                onObservationChange={
                    handleChecklistObservation
                }
            />


            {/*
       * CHECKLIST CONDUCTOR
       */}

            <ChecklistCard
                title="Condiciones del conductor"
                definitions={
                    driverChecklist
                }
                checklist={
                    checklist
                }
                onCheckChange={
                    handleChecklistChange
                }
                onObservationChange={
                    handleChecklistObservation
                }
            />


            {/*
       * OBSERVACIONES GENERALES
       */}

            <CCard className="mb-4">

                <CCardHeader>

                    <strong>
                        Observaciones
                    </strong>

                </CCardHeader>


                <CCardBody>

                    <CFormTextarea
                        label="Observaciones de inicio"
                        rows={3}
                        value={
                            startObservations
                        }
                        onChange={
                            (e) =>
                                setStartObservations(
                                    e.target.value,
                                )
                        }
                        placeholder="Indique daños visibles, detalles del vehículo o cualquier antecedente relevante"
                    />


                    <div className="mt-4">

                        {
                            requiredChecklistComplete

                                ? (

                                    <CAlert color="success">

                                        Todos los controles obligatorios están aprobados.

                                    </CAlert>

                                )

                                : (

                                    <CAlert color="warning">

                                        Debes completar todos los controles obligatorios para iniciar la jornada.

                                    </CAlert>

                                )
                        }

                    </div>


                    <CButton
                        color="success"
                        size="lg"
                        onClick={
                            handleStartShift
                        }
                        disabled={
                            submitting
                            ||
                            !selectedVehicleId
                            ||
                            !requiredChecklistComplete
                        }
                    >

                        {
                            submitting
                                ? 'Iniciando jornada...'
                                : 'Iniciar jornada'
                        }

                    </CButton>

                </CCardBody>

            </CCard>


            <ShiftHistory
                history={
                    history
                }
            />

        </>
    )
}


/**
 * =====================================================
 * COMPONENTE CHECKLIST
 * =====================================================
 */

type ChecklistCardProps = {
    title: string

    definitions:
    DriverChecklistDefinition[]

    checklist:
    ChecklistState[]

    onCheckChange:
    (
        code: string,
        checked: boolean,
    ) => void

    onObservationChange:
    (
        code: string,
        observation: string,
    ) => void
}


const ChecklistCard = ({
    title,
    definitions,
    checklist,
    onCheckChange,
    onObservationChange,
}: ChecklistCardProps) => {

    return (

        <CCard className="mb-4">

            <CCardHeader>

                <strong>
                    {title}
                </strong>

            </CCardHeader>


            <CCardBody>

                {
                    definitions.map(
                        (definition) => {

                            const state =
                                checklist.find(
                                    (item) =>
                                        item.code ===
                                        definition.code,
                                )


                            return (

                                <div
                                    key={
                                        definition.code
                                    }
                                    className="border rounded p-3 mb-3"
                                >

                                    <CRow>

                                        <CCol md={5}>

                                            <CFormCheck
                                                id={
                                                    `check-${definition.code}`
                                                }
                                                label={
                                                    definition.label
                                                }
                                                checked={
                                                    state
                                                        ?.checked
                                                    || false
                                                }
                                                onChange={
                                                    (e) =>
                                                        onCheckChange(
                                                            definition.code,
                                                            e.target.checked,
                                                        )
                                                }
                                            />


                                            {
                                                definition.required
                                                && (

                                                    <CBadge
                                                        color="danger"
                                                        className="mt-2"
                                                    >

                                                        Obligatorio

                                                    </CBadge>

                                                )
                                            }

                                        </CCol>


                                        <CCol md={7}>

                                            <CFormInput
                                                label="Observación"
                                                value={
                                                    state
                                                        ?.observations
                                                    || ''
                                                }
                                                onChange={
                                                    (e) =>
                                                        onObservationChange(
                                                            definition.code,
                                                            e.target.value,
                                                        )
                                                }
                                                placeholder={
                                                    state?.checked
                                                        ? 'Opcional'
                                                        : 'Indique la observación si corresponde'
                                                }
                                            />

                                        </CCol>

                                    </CRow>

                                </div>
                            )
                        },
                    )
                }

            </CCardBody>

        </CCard>
    )
}


/**
 * =====================================================
 * HISTORIAL
 * =====================================================
 */

const ShiftHistory = ({
    history,
}: {
    history: DriverShift[]
}) => {

    return (

        <CCard>

            <CCardHeader>

                <strong>
                    Historial de jornadas
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
                                Ticket
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Vehículo
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Inicio
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Término
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Km inicial
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Km final
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Recorrido
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Estado
                            </CTableHeaderCell>

                        </CTableRow>

                    </CTableHead>


                    <CTableBody>

                        {
                            history.map(
                                (shift) => {

                                    const distance =
                                        shift.final_mileage !==
                                            null
                                            &&
                                            shift.final_mileage !==
                                            undefined

                                            ? Math.max(
                                                0,

                                                Number(
                                                    shift.final_mileage,
                                                )
                                                -
                                                Number(
                                                    shift.initial_mileage,
                                                ),
                                            )

                                            : null


                                    return (

                                        <CTableRow
                                            key={
                                                shift.id
                                            }
                                        >

                                            <CTableDataCell>

                                                {
                                                    shift.ticket_number
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    shift.vehicle
                                                        ?.plate
                                                    || '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    new Date(
                                                        shift.started_at,
                                                    )
                                                        .toLocaleString(
                                                            'es-CL',
                                                        )
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    shift.ended_at

                                                        ? new Date(
                                                            shift.ended_at,
                                                        )
                                                            .toLocaleString(
                                                                'es-CL',
                                                            )

                                                        : '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    Number(
                                                        shift.initial_mileage,
                                                    )
                                                        .toLocaleString(
                                                            'es-CL',
                                                        )
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    shift.final_mileage !==
                                                        null
                                                        &&
                                                        shift.final_mileage !==
                                                        undefined

                                                        ? Number(
                                                            shift.final_mileage,
                                                        )
                                                            .toLocaleString(
                                                                'es-CL',
                                                            )

                                                        : '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    distance !== null
                                                        ? `${distance.toLocaleString(
                                                            'es-CL',
                                                        )} km`
                                                        : '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                <CBadge
                                                    color={
                                                        shift.status ===
                                                            'started'
                                                            ? 'success'

                                                            : shift.status ===
                                                                'completed'
                                                                ? 'secondary'

                                                                : 'warning'
                                                    }
                                                >

                                                    {
                                                        shift.status ===
                                                            'started'
                                                            ? 'En curso'

                                                            : shift.status ===
                                                                'completed'
                                                                ? 'Finalizada'

                                                                : 'Cancelada'
                                                    }

                                                </CBadge>

                                            </CTableDataCell>

                                        </CTableRow>
                                    )
                                },
                            )
                        }


                        {
                            history.length ===
                            0
                            && (

                                <CTableRow>

                                    <CTableDataCell
                                        colSpan={8}
                                        className="text-center"
                                    >

                                        No existen jornadas anteriores

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


export default DriverShiftView
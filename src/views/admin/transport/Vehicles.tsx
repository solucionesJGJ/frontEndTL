import React, {
    useEffect,
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
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import {
    createVehicle,
    deactivateVehicle,
    getVehicles,
    updateVehicle,
    type Vehicle,
} from '../../../services/vehicle.service'

import {
    useFeedback,
} from '../../../context/FeedbackContext'


const emptyForm = {
    plate: '',
    brand: '',
    model: '',
    year: '',
    active: true,
}


/**
 * Normaliza la patente solo para presentación.
 *
 * El backend igualmente vuelve a normalizarla,
 * por lo que la seguridad no depende de React.
 */
function normalizePlate(
    value: string,
) {
    return value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
}


const Vehicles = () => {

    const [
        vehicles,
        setVehicles,
    ] = useState<Vehicle[]>([])

    const [
        form,
        setForm,
    ] = useState(emptyForm)

    const [
        editingId,
        setEditingId,
    ] = useState<string | null>(
        null,
    )

    const [
        loading,
        setLoading,
    ] = useState(false)

    const [
        saving,
        setSaving,
    ] = useState(false)


    const {
        confirmAction,
        showAlert,
        showBackendError,
    } = useFeedback()


    /**
     * Cargar vehículos.
     */
    const loadVehicles =
        async () => {

            try {

                setLoading(true)


                const data =
                    await getVehicles()


                setVehicles(
                    data,
                )

            } catch (error) {

                showBackendError(
                    error,
                    'Error cargando vehículos',
                )

            } finally {

                setLoading(false)
            }
        }


    /**
     * Cambios del formulario.
     */
    const handleChange =
        (
            field:
                keyof typeof emptyForm,

            value:
                string | boolean,
        ) => {

            if (
                field === 'plate'
                &&
                typeof value === 'string'
            ) {

                setForm(
                    (previous) => ({
                        ...previous,

                        plate:
                            normalizePlate(
                                value,
                            ),
                    }),
                )

                return
            }


            setForm(
                (previous) => ({
                    ...previous,
                    [field]: value,
                }),
            )
        }


    /**
     * Crear / actualizar vehículo.
     */
    const handleSubmit =
        async () => {

            if (
                !form.plate.trim()
            ) {

                showAlert(
                    'La patente es obligatoria',
                    'warning',
                )

                return
            }


            /**
             * Año opcional.
             */
            if (
                form.year !== ''
            ) {

                const year =
                    Number(
                        form.year,
                    )


                if (
                    !Number.isInteger(
                        year,
                    )
                    ||
                    year < 1900
                    ||
                    year > 2100
                ) {

                    showAlert(
                        'Ingrese un año válido',
                        'warning',
                    )

                    return
                }
            }


            /**
             * Validación visual de patente duplicada.
             *
             * El backend mantiene igualmente
             * la validación definitiva.
             */
            const duplicate =
                vehicles.find(
                    (vehicle) =>
                        normalizePlate(
                            vehicle.plate,
                        ) ===
                        normalizePlate(
                            form.plate,
                        )
                        &&
                        vehicle.id !==
                        editingId,
                )


            if (duplicate) {

                showAlert(
                    `Ya existe el vehículo ${duplicate.plate}`,
                    'warning',
                )

                return
            }


            const confirmed =
                await confirmAction({
                    title:
                        editingId
                            ? 'Actualizar vehículo'
                            : 'Crear vehículo',

                    message:
                        editingId
                            ? 'Se actualizarán los datos del vehículo.'
                            : 'Se registrará un nuevo vehículo para las jornadas de transporte.',

                    confirmText:
                        editingId
                            ? 'Actualizar'
                            : 'Crear',

                    color:
                        'primary',

                    fields: [
                        {
                            label:
                                'Patente',

                            value:
                                normalizePlate(
                                    form.plate,
                                ),
                        },

                        {
                            label:
                                'Marca',

                            value:
                                form.brand
                                || '-',
                        },

                        {
                            label:
                                'Modelo',

                            value:
                                form.model
                                || '-',
                        },

                        {
                            label:
                                'Año',

                            value:
                                form.year
                                || '-',
                        },

                        {
                            label:
                                'Estado',

                            value:
                                form.active
                                    ? 'Activo'
                                    : 'Inactivo',
                        },
                    ],
                })


            if (!confirmed.confirmed) {
                return
            }


            const payload = {
                plate:
                    normalizePlate(
                        form.plate,
                    ),

                brand:
                    form.brand.trim(),

                model:
                    form.model.trim(),

                year:
                    form.year !== ''
                        ? Number(
                            form.year,
                        )
                        : null,

                active:
                    form.active,
            }


            try {

                setSaving(true)


                if (
                    editingId
                ) {

                    await updateVehicle(
                        editingId,
                        payload,
                    )


                    showAlert(
                        'Vehículo actualizado correctamente',
                        'success',
                    )

                } else {

                    await createVehicle(
                        payload,
                    )


                    showAlert(
                        'Vehículo creado correctamente',
                        'success',
                    )
                }


                setForm(
                    emptyForm,
                )

                setEditingId(
                    null,
                )


                await loadVehicles()

            } catch (error) {

                showBackendError(
                    error,
                    'Error guardando vehículo',
                )

            } finally {

                setSaving(false)
            }
        }


    /**
     * Editar vehículo.
     */
    const handleEdit =
        (
            vehicle: Vehicle,
        ) => {

            setEditingId(
                vehicle.id,
            )


            setForm({
                plate:
                    vehicle.plate
                    || '',

                brand:
                    vehicle.brand
                    || '',

                model:
                    vehicle.model
                    || '',

                year:
                    vehicle.year
                        ? String(
                            vehicle.year,
                        )
                        : '',

                active:
                    vehicle.active,
            })
        }


    /**
     * Cancelar edición.
     */
    const handleCancel =
        () => {

            setEditingId(
                null,
            )

            setForm(
                emptyForm,
            )
        }


    /**
     * Desactivar vehículo.
     */
    const handleDeactivate =
        async (
            vehicle:
                Vehicle,
        ) => {

            const confirmed =
                await confirmAction({
                    title:
                        'Desactivar vehículo',

                    message:
                        'El vehículo dejará de estar disponible para iniciar nuevas jornadas.',

                    confirmText:
                        'Desactivar',

                    color:
                        'danger',

                    fields: [
                        {
                            label:
                                'Patente',

                            value:
                                vehicle.plate,
                        },

                        {
                            label:
                                'Marca',

                            value:
                                vehicle.brand
                                || '-',
                        },

                        {
                            label:
                                'Modelo',

                            value:
                                vehicle.model
                                || '-',
                        },
                    ],
                })


            if (!confirmed.confirmed) {
                return
            }


            try {

                await deactivateVehicle(
                    vehicle.id,
                )


                showAlert(
                    'Vehículo desactivado correctamente',
                    'success',
                )


                /**
                 * Si estábamos editando
                 * justamente este vehículo,
                 * cerramos la edición.
                 */
                if (
                    editingId ===
                    vehicle.id
                ) {

                    handleCancel()
                }


                await loadVehicles()

            } catch (error) {

                showBackendError(
                    error,
                    'Error desactivando vehículo',
                )
            }
        }


    /**
     * Carga inicial.
     */
    useEffect(
        () => {

            loadVehicles()

        },
        [],
    )


    return (

        <>

            {/*
       * =====================================================
       * FORMULARIO
       * =====================================================
       */}

            <CCard className="mb-4">

                <CCardHeader>

                    <strong>
                        {
                            editingId
                                ? 'Editar vehículo'
                                : 'Nuevo vehículo'
                        }
                    </strong>

                </CCardHeader>


                <CCardBody>

                    <CRow className="mb-3">

                        <CCol md={3}>

                            <CFormInput
                                label="Patente"
                                value={
                                    form.plate
                                }
                                onChange={
                                    (e) =>
                                        handleChange(
                                            'plate',
                                            e.target.value,
                                        )
                                }
                                placeholder="Ej: ABCD12"
                                maxLength={20}
                            />

                        </CCol>


                        <CCol md={3}>

                            <CFormInput
                                label="Marca"
                                value={
                                    form.brand
                                }
                                onChange={
                                    (e) =>
                                        handleChange(
                                            'brand',
                                            e.target.value,
                                        )
                                }
                                placeholder="Ej: Peugeot"
                            />

                        </CCol>


                        <CCol md={3}>

                            <CFormInput
                                label="Modelo"
                                value={
                                    form.model
                                }
                                onChange={
                                    (e) =>
                                        handleChange(
                                            'model',
                                            e.target.value,
                                        )
                                }
                                placeholder="Ej: Partner"
                            />

                        </CCol>


                        <CCol md={2}>

                            <CFormInput
                                label="Año"
                                type="number"
                                min={1900}
                                max={2100}
                                value={
                                    form.year
                                }
                                onChange={
                                    (e) =>
                                        handleChange(
                                            'year',
                                            e.target.value,
                                        )
                                }
                                placeholder="2026"
                            />

                        </CCol>


                        <CCol
                            md={1}
                            className="d-flex align-items-end pb-2"
                        >

                            <CFormCheck
                                label="Activo"
                                checked={
                                    form.active
                                }
                                onChange={
                                    (e) =>
                                        handleChange(
                                            'active',
                                            e.target.checked,
                                        )
                                }
                            />

                        </CCol>

                    </CRow>


                    {
                        editingId
                        && (

                            <CAlert color="info">

                                Estás editando un vehículo existente.

                                {' '}

                                Cambiar su información no modifica las jornadas históricas que ya fueron registradas.

                            </CAlert>

                        )
                    }


                    <div className="d-flex gap-2">

                        <CButton
                            color="primary"
                            onClick={
                                handleSubmit
                            }
                            disabled={
                                saving
                            }
                        >

                            {
                                saving
                                    ? 'Guardando...'

                                    : editingId
                                        ? 'Actualizar vehículo'
                                        : 'Crear vehículo'
                            }

                        </CButton>


                        {
                            editingId
                            && (

                                <CButton
                                    color="secondary"
                                    onClick={
                                        handleCancel
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    Cancelar

                                </CButton>

                            )
                        }

                    </div>

                </CCardBody>

            </CCard>


            {/*
       * =====================================================
       * LISTADO
       * =====================================================
       */}

            <CCard>

                <CCardHeader>

                    <div className="d-flex justify-content-between align-items-center">

                        <strong>
                            Vehículos
                        </strong>


                        <span className="text-body-secondary">

                            {
                                vehicles.length
                            }

                            {' '}

                            registrado(s)

                        </span>

                    </div>

                </CCardHeader>


                <CCardBody>

                    <CTable
                        hover
                        responsive
                    >

                        <CTableHead>

                            <CTableRow>

                                <CTableHeaderCell>
                                    Patente
                                </CTableHeaderCell>

                                <CTableHeaderCell>
                                    Marca
                                </CTableHeaderCell>

                                <CTableHeaderCell>
                                    Modelo
                                </CTableHeaderCell>

                                <CTableHeaderCell>
                                    Año
                                </CTableHeaderCell>

                                <CTableHeaderCell>
                                    Estado
                                </CTableHeaderCell>

                                <CTableHeaderCell>
                                    Acciones
                                </CTableHeaderCell>

                            </CTableRow>

                        </CTableHead>


                        <CTableBody>

                            {
                                vehicles.map(
                                    (vehicle) => (

                                        <CTableRow
                                            key={
                                                vehicle.id
                                            }
                                        >

                                            <CTableDataCell>

                                                <strong>

                                                    {
                                                        vehicle.plate
                                                    }

                                                </strong>

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    vehicle.brand
                                                    || '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    vehicle.model
                                                    || '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                {
                                                    vehicle.year
                                                    || '-'
                                                }

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                <CBadge
                                                    color={
                                                        vehicle.active
                                                            ? 'success'
                                                            : 'secondary'
                                                    }
                                                >

                                                    {
                                                        vehicle.active
                                                            ? 'Activo'
                                                            : 'Inactivo'
                                                    }

                                                </CBadge>

                                            </CTableDataCell>


                                            <CTableDataCell>

                                                <div className="d-flex gap-2">

                                                    <CButton
                                                        color="warning"
                                                        size="sm"
                                                        onClick={
                                                            () =>
                                                                handleEdit(
                                                                    vehicle,
                                                                )
                                                        }
                                                    >

                                                        Editar

                                                    </CButton>


                                                    {
                                                        vehicle.active
                                                        && (

                                                            <CButton
                                                                color="danger"
                                                                size="sm"
                                                                onClick={
                                                                    () =>
                                                                        handleDeactivate(
                                                                            vehicle,
                                                                        )
                                                                }
                                                            >

                                                                Desactivar

                                                            </CButton>

                                                        )
                                                    }

                                                </div>

                                            </CTableDataCell>

                                        </CTableRow>

                                    ),
                                )
                            }


                            {
                                vehicles.length ===
                                0
                                && (

                                    <CTableRow>

                                        <CTableDataCell
                                            colSpan={6}
                                            className="text-center"
                                        >

                                            {
                                                loading
                                                    ? 'Cargando vehículos...'
                                                    : 'No hay vehículos registrados'
                                            }

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


export default Vehicles
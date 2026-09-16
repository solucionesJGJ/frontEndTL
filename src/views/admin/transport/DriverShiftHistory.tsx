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
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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
  getAllDriverShifts,
  getDriverShiftPhoto,
  type DriverShift,
  type DriverShiftPhotoType,
} from '../../../services/driverShift.service'

import {
  getVehicles,
  type Vehicle,
} from '../../../services/vehicle.service'

import {
  useFeedback,
} from '../../../context/FeedbackContext'


type PhotoModalState = {
  visible: boolean
  loading: boolean
  url: string | null
  title: string
  shift: DriverShift | null
  type: DriverShiftPhotoType | null
}


const DriverShiftHistory = () => {

  const [
    shifts,
    setShifts,
  ] = useState<DriverShift[]>([])

  const [
    vehicles,
    setVehicles,
  ] = useState<Vehicle[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    downloadingId,
    setDownloadingId,
  ] = useState<string | null>(null)

  const [
    selectedDriver,
    setSelectedDriver,
  ] = useState('')

  const [
    selectedVehicle,
    setSelectedVehicle,
  ] = useState('')

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState('')

  const [
    photoModal,
    setPhotoModal,
  ] = useState<PhotoModalState>({
    visible: false,
    loading: false,
    url: null,
    title: '',
    shift: null,
    type: null,
  })


  const {
    showBackendError,
  } = useFeedback()


  /**
   * Transportistas encontrados en el historial.
   */
  const drivers =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            {
              id: string
              name: string
              email: string
            }
          >()

        shifts.forEach(
          (shift) => {

            if (shift.driver?.id) {

              map.set(
                shift.driver.id,
                {
                  id:
                    shift.driver.id,

                  name:
                    shift.driver.name,

                  email:
                    shift.driver.email,
                },
              )
            }
          },
        )

        return Array.from(
          map.values(),
        ).sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
            ),
        )
      },
      [
        shifts,
      ],
    )


  /**
   * Filtros locales.
   */
  const filteredShifts =
    useMemo(
      () => {

        return shifts.filter(
          (shift) => {

            if (
              selectedDriver
              &&
              shift.user_id !==
              selectedDriver
            ) {
              return false
            }

            if (
              selectedVehicle
              &&
              shift.vehicle_id !==
              selectedVehicle
            ) {
              return false
            }

            if (
              selectedStatus
              &&
              shift.status !==
              selectedStatus
            ) {
              return false
            }

            return true
          },
        )
      },
      [
        shifts,
        selectedDriver,
        selectedVehicle,
        selectedStatus,
      ],
    )


  /**
   * Resumen.
   */
  const summary =
    useMemo(
      () => {

        let completed = 0
        let active = 0
        let totalKilometers = 0

        filteredShifts.forEach(
          (shift) => {

            if (
              shift.status ===
              'completed'
            ) {
              completed += 1
            }

            if (
              shift.status ===
              'started'
            ) {
              active += 1
            }

            if (
              shift.final_mileage !==
              null
              &&
              shift.final_mileage !==
              undefined
            ) {

              const distance =
                Number(
                  shift.final_mileage,
                )
                -
                Number(
                  shift.initial_mileage,
                )

              if (distance > 0) {
                totalKilometers +=
                  distance
              }
            }
          },
        )

        return {
          total:
            filteredShifts.length,

          completed,

          active,

          totalKilometers,
        }
      },
      [
        filteredShifts,
      ],
    )


  /**
   * Carga inicial.
   */
  const loadData =
    async () => {

      try {

        setLoading(true)

        const [
          shiftsData,
          vehiclesData,
        ] =
          await Promise.all([
            getAllDriverShifts(),
            getVehicles(),
          ])

        setShifts(
          shiftsData,
        )

        setVehicles(
          vehiclesData,
        )

      } catch (error) {

        showBackendError(
          error,
          'Error cargando historial de transporte',
        )

      } finally {

        setLoading(false)
      }
    }


  /**
   * Descargar comprobante.
   */
  const handleDownload =
    async (
      shift: DriverShift,
    ) => {

      try {

        setDownloadingId(
          shift.id,
        )

        await downloadDriverShiftTicket(
          shift.id,
          shift.ticket_number,
        )

      } catch (error) {

        showBackendError(
          error,
          'Error descargando comprobante',
        )

      } finally {

        setDownloadingId(
          null,
        )
      }
    }


  /**
   * Abrir evidencia fotográfica.
   */
  const handleViewPhoto =
    async (
      shift: DriverShift,
      type: DriverShiftPhotoType,
    ) => {

      /**
       * Eliminamos cualquier blob anterior.
       */
      if (photoModal.url) {
        window.URL.revokeObjectURL(
          photoModal.url,
        )
      }


      const title =
        type === 'driver'
          ? 'Fotografía del conductor'
          : 'Fotografía del vehículo'


      setPhotoModal({
        visible: true,
        loading: true,
        url: null,
        title,
        shift,
        type,
      })


      try {

        const url =
          await getDriverShiftPhoto(
            shift.id,
            type,
          )


        setPhotoModal({
          visible: true,
          loading: false,
          url,
          title,
          shift,
          type,
        })

      } catch (error) {

        setPhotoModal({
          visible: false,
          loading: false,
          url: null,
          title: '',
          shift: null,
          type: null,
        })


        showBackendError(
          error,
          type === 'driver'
            ? 'Error cargando fotografía del conductor'
            : 'Error cargando fotografía del vehículo',
        )
      }
    }


  /**
   * Cerrar modal y liberar memoria del blob.
   */
  const closePhotoModal =
    () => {

      if (photoModal.url) {

        window.URL.revokeObjectURL(
          photoModal.url,
        )
      }

      setPhotoModal({
        visible: false,
        loading: false,
        url: null,
        title: '',
        shift: null,
        type: null,
      })
    }


  /**
   * Limpiar filtros.
   */
  const clearFilters =
    () => {

      setSelectedDriver('')

      setSelectedVehicle('')

      setSelectedStatus('')
    }


  /**
   * Calcula recorrido.
   */
  const getDistance =
    (
      shift: DriverShift,
    ) => {

      if (
        shift.final_mileage === null
        ||
        shift.final_mileage === undefined
      ) {
        return null
      }

      return Math.max(
        0,

        Number(
          shift.final_mileage,
        )
        -
        Number(
          shift.initial_mileage,
        ),
      )
    }


  /**
   * Badge de estado.
   */
  const getStatusBadge =
    (
      status: DriverShift['status'],
    ) => {

      switch (status) {

        case 'started':

          return (
            <CBadge color="success">
              En curso
            </CBadge>
          )


        case 'completed':

          return (
            <CBadge color="secondary">
              Finalizada
            </CBadge>
          )


        case 'cancelled':

          return (
            <CBadge color="warning">
              Cancelada
            </CBadge>
          )


        default:

          return (
            <CBadge color="dark">
              {status}
            </CBadge>
          )
      }
    }


  useEffect(
    () => {

      loadData()

    },
    [],
  )


  /**
   * Liberamos cualquier URL temporal
   * si se desmonta la pantalla.
   */
  useEffect(
    () => {

      return () => {

        if (photoModal.url) {

          window.URL.revokeObjectURL(
            photoModal.url,
          )
        }
      }

    },
    [
      photoModal.url,
    ],
  )


  if (loading) {

    return (

      <div className="d-flex justify-content-center align-items-center py-5">

        <CSpinner />

        <span className="ms-3">
          Cargando historial...
        </span>

      </div>
    )
  }


  return (

    <>

      {/*
       * =====================================================
       * RESUMEN
       * =====================================================
       */}

      <CRow className="mb-4">

        <CCol
          sm={6}
          lg={3}
          className="mb-3"
        >

          <CCard className="h-100">

            <CCardBody>

              <div className="text-body-secondary">
                Jornadas
              </div>

              <div className="fs-3 fw-semibold">
                {summary.total}
              </div>

            </CCardBody>

          </CCard>

        </CCol>


        <CCol
          sm={6}
          lg={3}
          className="mb-3"
        >

          <CCard className="h-100">

            <CCardBody>

              <div className="text-body-secondary">
                En curso
              </div>

              <div className="fs-3 fw-semibold">
                {summary.active}
              </div>

            </CCardBody>

          </CCard>

        </CCol>


        <CCol
          sm={6}
          lg={3}
          className="mb-3"
        >

          <CCard className="h-100">

            <CCardBody>

              <div className="text-body-secondary">
                Finalizadas
              </div>

              <div className="fs-3 fw-semibold">
                {summary.completed}
              </div>

            </CCardBody>

          </CCard>

        </CCol>


        <CCol
          sm={6}
          lg={3}
          className="mb-3"
        >

          <CCard className="h-100">

            <CCardBody>

              <div className="text-body-secondary">
                Km registrados
              </div>

              <div className="fs-3 fw-semibold">

                {
                  summary
                    .totalKilometers
                    .toLocaleString(
                      'es-CL',
                    )
                }

              </div>

            </CCardBody>

          </CCard>

        </CCol>

      </CRow>


      {/*
       * =====================================================
       * FILTROS
       * =====================================================
       */}

      <CCard className="mb-4">

        <CCardHeader>

          <strong>
            Filtros
          </strong>

        </CCardHeader>


        <CCardBody>

          <CRow>

            <CCol
              md={4}
              className="mb-3"
            >

              <CFormSelect
                label="Transportista"
                value={
                  selectedDriver
                }
                onChange={
                  (e) =>
                    setSelectedDriver(
                      e.target.value,
                    )
                }
              >

                <option value="">
                  Todos los transportistas
                </option>

                {
                  drivers.map(
                    (driver) => (

                      <option
                        key={
                          driver.id
                        }
                        value={
                          driver.id
                        }
                      >

                        {driver.name}

                      </option>

                    ),
                  )
                }

              </CFormSelect>

            </CCol>


            <CCol
              md={3}
              className="mb-3"
            >

              <CFormSelect
                label="Vehículo"
                value={
                  selectedVehicle
                }
                onChange={
                  (e) =>
                    setSelectedVehicle(
                      e.target.value,
                    )
                }
              >

                <option value="">
                  Todos los vehículos
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

                        {vehicle.plate}

                        {' - '}

                        {
                          vehicle.brand
                          || ''
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


            <CCol
              md={3}
              className="mb-3"
            >

              <CFormSelect
                label="Estado"
                value={
                  selectedStatus
                }
                onChange={
                  (e) =>
                    setSelectedStatus(
                      e.target.value,
                    )
                }
              >

                <option value="">
                  Todos
                </option>

                <option value="started">
                  En curso
                </option>

                <option value="completed">
                  Finalizada
                </option>

                <option value="cancelled">
                  Cancelada
                </option>

              </CFormSelect>

            </CCol>


            <CCol
              md={2}
              className="d-flex align-items-end mb-3"
            >

              <CButton
                color="secondary"
                className="w-100"
                onClick={
                  clearFilters
                }
              >

                Limpiar

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

          <div className="d-flex justify-content-between align-items-center">

            <strong>
              Historial de jornadas
            </strong>

            <span className="text-body-secondary">

              {filteredShifts.length}

              {' registro(s)'}

            </span>

          </div>

        </CCardHeader>


        <CCardBody>

          {
            filteredShifts.length === 0
            && (

              <CAlert color="info">

                No existen jornadas que coincidan con los filtros seleccionados.

              </CAlert>

            )
          }


          <CTable
            hover
            responsive
            align="middle"
          >

            <CTableHead>

              <CTableRow>

                <CTableHeaderCell>
                  Ticket
                </CTableHeaderCell>

                <CTableHeaderCell>
                  Transportista
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

                <CTableHeaderCell>
                  Evidencias
                </CTableHeaderCell>

                <CTableHeaderCell>
                  Comprobante
                </CTableHeaderCell>

              </CTableRow>

            </CTableHead>


            <CTableBody>

              {
                filteredShifts.map(
                  (shift) => {

                    const distance =
                      getDistance(
                        shift,
                      )


                    const hasDriverPhoto =
                      Boolean(
                        shift.driver_photo_path,
                      )


                    const hasVehiclePhoto =
                      Boolean(
                        shift.vehicle_photo_path,
                      )


                    return (

                      <CTableRow
                        key={
                          shift.id
                        }
                      >

                        <CTableDataCell>

                          <strong>
                            {
                              shift.ticket_number
                            }
                          </strong>

                        </CTableDataCell>


                        <CTableDataCell>

                          <div>

                            {
                              shift.driver
                                ?.name
                              || '-'
                            }

                          </div>

                          {
                            shift.driver
                              ?.email
                            && (

                              <small className="text-body-secondary">

                                {
                                  shift.driver.email
                                }

                              </small>

                            )
                          }

                        </CTableDataCell>


                        <CTableDataCell>

                          <strong>

                            {
                              shift.vehicle
                                ?.plate
                              || '-'
                            }

                          </strong>

                          <div>

                            <small className="text-body-secondary">

                              {
                                shift.vehicle
                                  ?.brand
                                || ''
                              }

                              {' '}

                              {
                                shift.vehicle
                                  ?.model
                                || ''
                              }

                            </small>

                          </div>

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

                          {
                            getStatusBadge(
                              shift.status,
                            )
                          }

                        </CTableDataCell>


                        {/*
                         * EVIDENCIAS
                         */}

                        <CTableDataCell>

                          {
                            !hasDriverPhoto
                              &&
                              !hasVehiclePhoto

                              ? (

                                <span className="text-body-secondary">

                                  Sin evidencia

                                </span>

                              )

                              : (

                                <div className="d-flex flex-column gap-2">

                                  {
                                    hasDriverPhoto
                                    && (

                                      <CButton
                                        color="info"
                                        variant="outline"
                                        size="sm"
                                        onClick={
                                          () =>
                                            handleViewPhoto(
                                              shift,
                                              'driver',
                                            )
                                        }
                                      >

                                        Conductor

                                      </CButton>

                                    )
                                  }


                                  {
                                    hasVehiclePhoto
                                    && (

                                      <CButton
                                        color="info"
                                        variant="outline"
                                        size="sm"
                                        onClick={
                                          () =>
                                            handleViewPhoto(
                                              shift,
                                              'vehicle',
                                            )
                                        }
                                      >

                                        Vehículo

                                      </CButton>

                                    )
                                  }

                                </div>

                              )
                          }

                        </CTableDataCell>


                        <CTableDataCell>

                          <CButton
                            color="primary"
                            variant="outline"
                            size="sm"
                            disabled={
                              downloadingId ===
                              shift.id
                            }
                            onClick={
                              () =>
                                handleDownload(
                                  shift,
                                )
                            }
                          >

                            {
                              downloadingId ===
                                shift.id

                                ? 'Descargando...'

                                : 'PDF'
                            }

                          </CButton>

                        </CTableDataCell>

                      </CTableRow>

                    )
                  },
                )
              }

            </CTableBody>

          </CTable>

        </CCardBody>

      </CCard>


      {/*
       * =====================================================
       * MODAL EVIDENCIA
       * =====================================================
       */}

      <CModal
        visible={
          photoModal.visible
        }
        onClose={
          closePhotoModal
        }
        size="lg"
        alignment="center"
      >

        <CModalHeader>

          <CModalTitle>

            {photoModal.title}

          </CModalTitle>

        </CModalHeader>


        <CModalBody>

          {
            photoModal.shift
            && (

              <div className="mb-3">

                <div>

                  <strong>
                    Jornada:
                  </strong>

                  {' '}

                  {
                    photoModal
                      .shift
                      .ticket_number
                  }

                </div>


                <div>

                  <strong>
                    Transportista:
                  </strong>

                  {' '}

                  {
                    photoModal
                      .shift
                      .driver
                      ?.name
                    || '-'
                  }

                </div>


                <div>

                  <strong>
                    Vehículo:
                  </strong>

                  {' '}

                  {
                    photoModal
                      .shift
                      .vehicle
                      ?.plate
                    || '-'
                  }

                </div>


                <div>

                  <strong>
                    Inicio:
                  </strong>

                  {' '}

                  {
                    new Date(
                      photoModal
                        .shift
                        .started_at,
                    )
                      .toLocaleString(
                        'es-CL',
                      )
                  }

                </div>

              </div>

            )
          }


          {
            photoModal.loading

              ? (

                <div className="d-flex justify-content-center align-items-center py-5">

                  <CSpinner />

                  <span className="ms-3">

                    Cargando fotografía...

                  </span>

                </div>

              )

              : photoModal.url

                ? (

                  <div className="text-center">

                    <img
                      src={
                        photoModal.url
                      }
                      alt={
                        photoModal.title
                      }
                      style={{
                        display:
                          'block',

                        width:
                          '100%',

                        maxHeight:
                          '70vh',

                        objectFit:
                          'contain',

                        borderRadius:
                          '8px',
                      }}
                    />

                  </div>

                )

                : (

                  <CAlert color="warning">

                    No fue posible cargar la fotografía.

                  </CAlert>

                )
          }

        </CModalBody>


        <CModalFooter>

          <CButton
            color="secondary"
            onClick={
              closePhotoModal
            }
          >

            Cerrar

          </CButton>

        </CModalFooter>

      </CModal>

    </>
  )
}


export default DriverShiftHistory
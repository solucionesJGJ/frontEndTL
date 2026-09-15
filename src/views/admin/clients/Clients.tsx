import React, { useEffect, useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormSelect,
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
  createClient,
  deleteClient,
  getClients,
  updateClient,
  type Client,
  type ClientPayload,
} from '../../../services/client.service'

import {
  getEconomicActivities,
  type EconomicActivity,
} from '../../../services/economicActivity.service'

import { useFeedback } from '../../../context/FeedbackContext'

const emptyForm = {
  name: '',
  rut: '',
  legal_name: '',
  address: '',
  commune: '',
  city: '',
  dte_email: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  code_prefix: '',
  active: true,
}

function generateClientPrefix(name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase()

  if (!clean) {
    return ''
  }

  const words = clean.split(/\s+/).filter(Boolean)

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join('')
      .slice(0, 4)
  }

  return clean.slice(0, 4)
}

function normalizePrefix(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

function normalizeRut(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^0-9K.-]/g, '')
    .slice(0, 12)
}

function normalizeOptionalValue(value: string): string | null {
  const normalized = value.trim()

  return normalized ? normalized : null
}

function getClientActivities(client: Client): EconomicActivity[] {
  return (client.economic_activity_links || [])
    .map((link) => link.economic_activity)
    .filter((activity): activity is EconomicActivity => Boolean(activity))
}

function getClientDteActivity(client: Client): EconomicActivity | null {
  const link = (client.economic_activity_links || []).find(
    (item) => item.is_dte_default,
  )

  return link?.economic_activity || null
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([])

  const [form, setForm] = useState(emptyForm)

  const [editingId, setEditingId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)

  const [activitySearch, setActivitySearch] = useState('')

  const [activityResults, setActivityResults] = useState<
    EconomicActivity[]
  >([])

  const [selectedActivities, setSelectedActivities] = useState<
    EconomicActivity[]
  >([])

  const [dteEconomicActivityId, setDteEconomicActivityId] = useState('')

  const [isSearchingActivities, setIsSearchingActivities] = useState(false)

  const { confirmAction, showAlert, showBackendError } = useFeedback()

  /**
   * Prefijos utilizados por otros clientes.
   */
  const existingPrefixes = useMemo(
    () =>
      clients
        .filter((client) => client.id !== editingId)
        .map((client) => client.code_prefix?.trim().toUpperCase())
        .filter(Boolean),
    [clients, editingId],
  )

  /**
   * RUT utilizados por otros clientes.
   */
  const existingRuts = useMemo(
    () =>
      clients
        .filter((client) => client.id !== editingId)
        .map((client) => client.rut?.trim().toUpperCase())
        .filter(Boolean),
    [clients, editingId],
  )

  /**
   * Cargar clientes.
   */
  const loadClients = async () => {
    try {
      setIsLoading(true)

      const data = await getClients()

      setClients(data)
    } catch (error) {
      showBackendError(error, 'Error cargando clientes')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Cambios generales del formulario.
   */
  const handleChange = (
    field: keyof typeof emptyForm,
    value: string | boolean,
  ) => {
    if (field === 'rut' && typeof value === 'string') {
      setForm((prev) => ({
        ...prev,
        rut: normalizeRut(value),
      }))

      return
    }

    if (field === 'code_prefix' && typeof value === 'string') {
      setForm((prev) => ({
        ...prev,
        code_prefix: normalizePrefix(value),
      }))

      return
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  /**
   * Nombre comercial.
   *
   * Si estamos creando un cliente,
   * genera automáticamente el prefijo.
   */
  const handleNameChange = (value: string) => {
    setForm((prev) => {
      const currentGeneratedPrefix = generateClientPrefix(prev.name)

      const shouldRegeneratePrefix =
        !editingId &&
        (!prev.code_prefix ||
          prev.code_prefix === currentGeneratedPrefix)

      return {
        ...prev,
        name: value,
        code_prefix: shouldRegeneratePrefix
          ? generateClientPrefix(value)
          : prev.code_prefix,
      }
    })
  }

  /**
   * Agregar actividad económica.
   */
  const handleAddActivity = (activity: EconomicActivity) => {
    const alreadySelected = selectedActivities.some(
      (item) => item.id === activity.id,
    )

    if (alreadySelected) {
      showAlert('La actividad económica ya fue agregada', 'warning')

      return
    }

    setSelectedActivities((prev) => [...prev, activity])

    /**
     * La primera actividad seleccionada
     * queda como actividad DTE por defecto.
     */
    if (!dteEconomicActivityId) {
      setDteEconomicActivityId(activity.id)
    }

    setActivitySearch('')

    setActivityResults([])
  }

  /**
   * Quitar actividad económica.
   */
  const handleRemoveActivity = (activityId: string) => {
    const nextActivities = selectedActivities.filter(
      (activity) => activity.id !== activityId,
    )

    setSelectedActivities(nextActivities)

    /**
     * Si quitamos la actividad DTE,
     * asignamos la primera restante.
     */
    if (dteEconomicActivityId === activityId) {
      setDteEconomicActivityId(nextActivities[0]?.id || '')
    }
  }

  /**
   * Crear o actualizar cliente.
   */
  const handleSubmit = async () => {
    const name = form.name.trim()

    const rut = form.rut.trim()

    const legalName = form.legal_name.trim()

    const address = form.address.trim()

    const commune = form.commune.trim()

    const city = form.city.trim()

    const contactName = form.contact_name.trim()

    const contactEmail = form.contact_email.trim()

    const contactPhone = form.contact_phone.trim()

    const codePrefix = normalizePrefix(form.code_prefix)

    if (!name) {
      showAlert('El nombre comercial es obligatorio', 'warning')

      return
    }

    if (!rut) {
      showAlert('El RUT del cliente es obligatorio', 'warning')

      return
    }

    if (!legalName) {
      showAlert('La razón social es obligatoria', 'warning')

      return
    }

    if (!address) {
      showAlert('La dirección es obligatoria', 'warning')

      return
    }

    if (!commune) {
      showAlert('La comuna es obligatoria', 'warning')

      return
    }

    if (!city) {
      showAlert('La ciudad es obligatoria', 'warning')

      return
    }

    if (!contactName) {
      showAlert('El nombre de contacto es obligatorio', 'warning')

      return
    }

    if (!contactEmail) {
      showAlert('El email de contacto es obligatorio', 'warning')

      return
    }

    if (!contactPhone) {
      showAlert('El teléfono de contacto es obligatorio', 'warning')

      return
    }

    if (!codePrefix) {
      showAlert('El prefijo del cliente es obligatorio', 'warning')

      return
    }

    if (existingPrefixes.includes(codePrefix)) {
      showAlert(
        `El prefijo ${codePrefix} ya está siendo utilizado por otro cliente`,
        'warning',
      )

      return
    }

    if (existingRuts.includes(rut.toUpperCase())) {
      showAlert('Ya existe otro cliente con ese RUT', 'warning')

      return
    }

    if (selectedActivities.length === 0) {
      showAlert(
        'Debe seleccionar al menos una actividad económica',
        'warning',
      )

      return
    }

    if (!dteEconomicActivityId) {
      showAlert(
        'Debe seleccionar la actividad económica que se utilizará para DTE',
        'warning',
      )

      return
    }

    const dteActivity = selectedActivities.find(
      (activity) => activity.id === dteEconomicActivityId,
    )

    if (!dteActivity) {
      showAlert('La actividad DTE seleccionada no es válida', 'warning')

      return
    }

    const confirmed = await confirmAction({
      title: editingId ? 'Actualizar cliente' : 'Crear cliente',
      message: 'Se guardarán los siguientes datos:',
      confirmText: editingId ? 'Actualizar' : 'Crear',
      color: 'primary',
      fields: [
        {
          label: 'Nombre comercial',
          value: name,
        },
        {
          label: 'Razón social',
          value: legalName,
        },
        {
          label: 'RUT',
          value: rut,
        },
        {
          label: 'Prefijo',
          value: codePrefix,
        },
        {
          label: 'Dirección',
          value: `${address}, ${commune}, ${city}`,
        },
        {
          label: 'Actividad DTE',
          value: `${dteActivity.code} - ${dteActivity.description}`,
        },
        {
          label: 'Actividades',
          value: String(selectedActivities.length),
        },
        {
          label: 'Contacto',
          value: contactName,
        },
      ],
    })

    if (!confirmed.confirmed) {
      return
    }

    const payload: ClientPayload = {
      name,
      rut,
      legal_name: legalName,
      address,
      commune,
      city,
      dte_email: normalizeOptionalValue(form.dte_email),
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      code_prefix: codePrefix,
      active: form.active,
      economic_activity_ids: selectedActivities.map(
        (activity) => activity.id,
      ),
      dte_economic_activity_id: dteEconomicActivityId,
    }

    try {
      setIsLoading(true)

      if (editingId) {
        await updateClient(editingId, payload)

        showAlert('Cliente actualizado correctamente', 'success')
      } else {
        await createClient(payload)

        showAlert('Cliente creado correctamente', 'success')
      }

      handleReset()

      await loadClients()
    } catch (error) {
      showBackendError(error, 'Error guardando cliente')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Editar cliente.
   */
  const handleEdit = (client: Client) => {
    const activities = getClientActivities(client)

    const dteActivity = getClientDteActivity(client)

    setEditingId(client.id)

    setForm({
      name: client.name || '',
      rut: client.rut || '',
      legal_name: client.legal_name || '',
      address: client.address || '',
      commune: client.commune || '',
      city: client.city || '',
      dte_email: client.dte_email || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      code_prefix: client.code_prefix || '',
      active: client.active,
    })

    setSelectedActivities(activities)

    setDteEconomicActivityId(
      dteActivity?.id || activities[0]?.id || '',
    )

    setActivitySearch('')

    setActivityResults([])
  }

  /**
   * Desactivar cliente.
   */
  const handleDeactivate = async (client: Client) => {
    const confirmed = await confirmAction({
      title: 'Desactivar cliente',
      message: '¿Seguro que deseas desactivar este cliente?',
      confirmText: 'Desactivar',
      color: 'danger',
      fields: [
        {
          label: 'Cliente',
          value: client.name,
        },
        {
          label: 'RUT',
          value: client.rut || '-',
        },
        {
          label: 'Razón social',
          value: client.legal_name || '-',
        },
      ],
    })

    if (!confirmed.confirmed) {
      return
    }

    try {
      setIsLoading(true)

      await deleteClient(client.id)

      showAlert('Cliente desactivado correctamente', 'success')

      await loadClients()
    } catch (error) {
      showBackendError(error, 'Error desactivando cliente')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Limpiar formulario.
   */
  const handleReset = () => {
    setForm(emptyForm)

    setEditingId(null)

    setSelectedActivities([])

    setDteEconomicActivityId('')

    setActivitySearch('')

    setActivityResults([])
  }

  /**
   * Cancelar edición.
   */
  const handleCancel = () => {
    handleReset()

    showAlert('Edición cancelada', 'success')
  }

  /**
   * Buscar actividades económicas.
   *
   * Se utiliza debounce para evitar
   * consultar el backend en cada tecla.
   */
  useEffect(() => {
    const search = activitySearch.trim()

    if (search.length < 2) {
      setActivityResults([])

      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        setIsSearchingActivities(true)

        const activities = await getEconomicActivities(search)

        setActivityResults(activities)
      } catch (error) {
        showBackendError(
          error,
          'Error buscando actividades económicas',
        )
      } finally {
        setIsSearchingActivities(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [activitySearch])

  /**
   * Carga inicial.
   */
  useEffect(() => {
    loadClients()
  }, [])

  return (
    <CCard>
      <CCardHeader>
        <strong>Clientes</strong>
      </CCardHeader>

      <CCardBody>
        {/*
         * =====================================================
         * DATOS GENERALES
         * =====================================================
         */}

        <CRow className="mb-3">
          <CCol md={4}>
            <CFormInput
              label="Nombre comercial"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Hotel Santiago"
            />
          </CCol>

          <CCol md={4}>
            <CFormInput
              label="Razón social"
              value={form.legal_name}
              onChange={(e) =>
                handleChange('legal_name', e.target.value)
              }
              placeholder="Ej: Hotel Santiago SpA"
            />
          </CCol>

          <CCol md={2}>
            <CFormInput
              label="RUT"
              value={form.rut}
              onChange={(e) => handleChange('rut', e.target.value)}
              placeholder="76.123.456-7"
            />
          </CCol>

          <CCol md={2}>
            <CFormInput
              label="Prefijo"
              value={form.code_prefix}
              onChange={(e) =>
                handleChange('code_prefix', e.target.value)
              }
              placeholder="Ej: HS"
            />
          </CCol>
        </CRow>

        {/*
         * =====================================================
         * ACTIVIDADES ECONÓMICAS
         * =====================================================
         */}

        <CRow className="mb-3">
          <CCol md={12}>
            <div className="mb-2">
              <strong>Actividades económicas SII</strong>
            </div>
          </CCol>

          <CCol md={12}>
            <div className="position-relative">
              <CFormInput
                label="Buscar actividad"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Buscar por código o descripción"
              />

              {isSearchingActivities && (
                <CSpinner
                  size="sm"
                  className="position-absolute"
                  style={{
                    right: '12px',
                    bottom: '10px',
                  }}
                />
              )}
            </div>
          </CCol>
        </CRow>

        {activityResults.length > 0 && (
          <CRow className="mb-3">
            <CCol md={12}>
              <CTable hover responsive bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Código</CTableHeaderCell>

                    <CTableHeaderCell>
                      Actividad económica
                    </CTableHeaderCell>

                    <CTableHeaderCell>IVA</CTableHeaderCell>

                    <CTableHeaderCell>Acción</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {activityResults.map((activity) => {
                    const selected = selectedActivities.some(
                      (item) => item.id === activity.id,
                    )

                    return (
                      <CTableRow key={activity.id}>
                        <CTableDataCell>
                          <strong>{activity.code}</strong>
                        </CTableDataCell>

                        <CTableDataCell>
                          {activity.description}
                        </CTableDataCell>

                        <CTableDataCell>
                          {activity.vat_affected || '-'}
                        </CTableDataCell>

                        <CTableDataCell>
                          <CButton
                            color="primary"
                            size="sm"
                            disabled={selected}
                            onClick={() =>
                              handleAddActivity(activity)
                            }
                          >
                            {selected ? 'Agregada' : 'Agregar'}
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </CCol>
          </CRow>
        )}

        {selectedActivities.length > 0 && (
          <CRow className="mb-3">
            <CCol md={12}>
              <CTable hover responsive bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Código</CTableHeaderCell>

                    <CTableHeaderCell>
                      Actividad seleccionada
                    </CTableHeaderCell>

                    <CTableHeaderCell>
                      Actividad DTE
                    </CTableHeaderCell>

                    <CTableHeaderCell>Acción</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {selectedActivities.map((activity) => (
                    <CTableRow key={activity.id}>
                      <CTableDataCell>
                        <strong>{activity.code}</strong>
                      </CTableDataCell>

                      <CTableDataCell>
                        {activity.description}
                      </CTableDataCell>

                      <CTableDataCell>
                        <CFormCheck
                          type="radio"
                          name="dte_activity"
                          label="Usar en DTE"
                          checked={
                            dteEconomicActivityId === activity.id
                          }
                          onChange={() =>
                            setDteEconomicActivityId(activity.id)
                          }
                        />
                      </CTableDataCell>

                      <CTableDataCell>
                        <CButton
                          color="secondary"
                          size="sm"
                          onClick={() =>
                            handleRemoveActivity(activity.id)
                          }
                        >
                          Quitar
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCol>
          </CRow>
        )}

        {/*
         * =====================================================
         * DIRECCIÓN
         * =====================================================
         */}

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormInput
              label="Dirección"
              value={form.address}
              onChange={(e) =>
                handleChange('address', e.target.value)
              }
              placeholder="Ej: Av. Providencia 1234"
            />
          </CCol>

          <CCol md={3}>
            <CFormInput
              label="Comuna"
              value={form.commune}
              onChange={(e) =>
                handleChange('commune', e.target.value)
              }
              placeholder="Ej: Providencia"
            />
          </CCol>

          <CCol md={3}>
            <CFormInput
              label="Ciudad"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Ej: Santiago"
            />
          </CCol>
        </CRow>

        {/*
         * =====================================================
         * CONTACTO
         * =====================================================
         */}

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormInput
              label="Nombre contacto"
              value={form.contact_name}
              onChange={(e) =>
                handleChange('contact_name', e.target.value)
              }
              placeholder="Nombre contacto"
            />
          </CCol>

          <CCol md={3}>
            <CFormInput
              label="Email contacto"
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                handleChange('contact_email', e.target.value)
              }
              placeholder="contacto@empresa.cl"
            />
          </CCol>

          <CCol md={3}>
            <CFormInput
              label="Teléfono"
              value={form.contact_phone}
              onChange={(e) =>
                handleChange('contact_phone', e.target.value)
              }
              placeholder="+56912345678"
            />
          </CCol>

          <CCol md={3}>
            <CFormInput
              label="Email DTE"
              type="email"
              value={form.dte_email}
              onChange={(e) =>
                handleChange('dte_email', e.target.value)
              }
              placeholder="dte@empresa.cl"
            />
          </CCol>
        </CRow>

        {/*
         * =====================================================
         * ESTADO
         * =====================================================
         */}

        <CRow className="mb-3">
          <CCol md={12}>
            <CFormCheck
              label="Activo"
              checked={form.active}
              onChange={(e) =>
                handleChange('active', e.target.checked)
              }
            />
          </CCol>
        </CRow>

        {/*
         * =====================================================
         * BOTONES
         * =====================================================
         */}

        <CRow className="mb-4">
          <CCol md={12} className="d-flex gap-2">
            <CButton
              color="primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {editingId ? 'Actualizar' : 'Crear'}
            </CButton>

            {editingId && (
              <CButton color="secondary" onClick={handleCancel}>
                Cancelar
              </CButton>
            )}
          </CCol>
        </CRow>

        {/*
         * =====================================================
         * TABLA CLIENTES
         * =====================================================
         */}

        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Cliente</CTableHeaderCell>

              <CTableHeaderCell>RUT</CTableHeaderCell>

              <CTableHeaderCell>Razón social</CTableHeaderCell>

              <CTableHeaderCell>Actividad DTE</CTableHeaderCell>

              <CTableHeaderCell>Comuna</CTableHeaderCell>

              <CTableHeaderCell>Contacto</CTableHeaderCell>

              <CTableHeaderCell>Prefijo</CTableHeaderCell>

              <CTableHeaderCell>Activo</CTableHeaderCell>

              <CTableHeaderCell>Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>

          <CTableBody>
            {clients.map((client) => {
              const dteActivity = getClientDteActivity(client)

              return (
                <CTableRow key={client.id}>
                  <CTableDataCell>
                    <strong>{client.name}</strong>
                  </CTableDataCell>

                  <CTableDataCell>{client.rut || '-'}</CTableDataCell>

                  <CTableDataCell>
                    {client.legal_name || '-'}
                  </CTableDataCell>

                  <CTableDataCell>
                    {dteActivity ? (
                      <>
                        <strong>{dteActivity.code}</strong>

                        <div className="small">
                          {dteActivity.description}
                        </div>
                      </>
                    ) : (
                      client.business_activity || '-'
                    )}
                  </CTableDataCell>

                  <CTableDataCell>
                    {client.commune || '-'}
                  </CTableDataCell>

                  <CTableDataCell>
                    <div>{client.contact_name || '-'}</div>

                    <div className="small">
                      {client.contact_email || '-'}
                    </div>
                  </CTableDataCell>

                  <CTableDataCell>
                    {client.code_prefix || '-'}
                  </CTableDataCell>

                  <CTableDataCell>
                    <CBadge
                      color={client.active ? 'success' : 'secondary'}
                    >
                      {client.active ? 'Sí' : 'No'}
                    </CBadge>
                  </CTableDataCell>

                  <CTableDataCell>
                    <div className="d-flex gap-2">
                      <CButton
                        color="warning"
                        size="sm"
                        onClick={() => handleEdit(client)}
                      >
                        Editar
                      </CButton>

                      {client.active && (
                        <CButton
                          color="secondary"
                          size="sm"
                          onClick={() => handleDeactivate(client)}
                        >
                          Desactivar
                        </CButton>
                      )}
                    </div>
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default Clients
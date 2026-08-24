import React from 'react'

import CIcon from '@coreui/icons-react'

import {
  cilList,
  cilPeople,
  cilSpeedometer,
  cilStorage,
  cilUser,
  cilTruck,
} from '@coreui/icons'

import {
  CNavItem,
  CNavTitle,
} from '@coreui/react'


export const getNavByRole = (
  {
    role,
  }: {
    role?: string
  },
) => {

  const nav: any[] = []


  /**
   * =====================================================
   * ADMINISTRACIÓN
   * =====================================================
   */

  if (
    role === 'admin'
  ) {

    nav.push(
      {
        component:
          CNavTitle,

        name:
          'Administración',
      },

      {
        component:
          CNavItem,

        name:
          'Clientes',

        to:
          '/admin/clients',

        icon:
          <CIcon
            icon={cilPeople}
            customClassName="nav-icon"
          />,
      },

      {
        component:
          CNavItem,

        name:
          'Usuarios',

        to:
          '/admin/users',

        icon:
          <CIcon
            icon={cilUser}
            customClassName="nav-icon"
          />,
      },

      {
        component:
          CNavItem,

        name:
          'Prendas',

        to:
          '/admin/garments',

        icon:
          <CIcon
            icon={cilList}
            customClassName="nav-icon"
          />,
      },
    )
  }


  /**
   * =====================================================
   * OPERADOR CLIENTE
   * =====================================================
   */

  if (
    role ===
    'client_operator'
  ) {

    nav.push(
      {
        component:
          CNavTitle,

        name:
          'Operario Cliente',
      },

      {
        component:
          CNavItem,

        name:
          'Dashboard Cliente',

        to:
          '/dashboard/client',

        icon:
          <CIcon
            icon={cilSpeedometer}
            customClassName="nav-icon"
          />,
      },

      {
        component:
          CNavItem,

        name:
          'Mis lotes',

        to:
          '/operator/batches',

        icon:
          <CIcon
            icon={cilList}
            customClassName="nav-icon"
          />,
      },
    )
  }


  /**
   * =====================================================
   * BODEGA / PLANTA
   * =====================================================
   */

  if (
    role === 'admin'
    ||
    role ===
    'warehouse_operator'
  ) {

    nav.push(
      {
        component:
          CNavTitle,

        name:
          'Bodega / Planta',
      },

      {
        component:
          CNavItem,

        name:
          'Dashboard Planta',

        to:
          '/dashboard/plant',

        icon:
          <CIcon
            icon={cilSpeedometer}
            customClassName="nav-icon"
          />,
      },

      {
        component:
          CNavItem,

        name:
          'Procesar lotes',

        to:
          '/operator/batches',

        icon:
          <CIcon
            icon={cilList}
            customClassName="nav-icon"
          />,
      },

      {
        component:
          CNavItem,

        name:
          'Stock actual',

        to:
          '/operator/stock',

        icon:
          <CIcon
            icon={cilStorage}
            customClassName="nav-icon"
          />,
      },
    )
  }


  /**
   * =====================================================
   * TRANSPORTISTA
   * =====================================================
   */

  if (
    role === 'transportista'
  ) {

    nav.push(
      {
        component:
          CNavTitle,

        name:
          'Transporte',
      },

      {
        component:
          CNavItem,

        name:
          'Mi jornada',

        to:
          '/driver/shift',

        icon:
          <CIcon
            icon={cilTruck}
            customClassName="nav-icon"
          />,
      },
    )
  }


  /**
   * El administrador también podrá
   * acceder al módulo de transporte.
   */
  if (
    role === 'admin'
  ) {

    nav.push(
      {
        component:
          CNavTitle,

        name:
          'Transporte',
      }, {
      component:
        CNavItem,

      name:
        'Vehículos',

      to:
        '/admin/transport/vehicles',

      icon:
        <CIcon
          icon={cilTruck}
          customClassName="nav-icon"
        />,
    },
      {
        component:
          CNavItem,

        name:
          'Historial jornadas',

        to:
          '/admin/transport/history',

        icon:
          <CIcon
            icon={cilList}
            customClassName="nav-icon"
          />,
      },

      /* {
        component:
          CNavItem,

        name:
          'Jornada transportista',

        to:
          '/driver/shift',

        icon:
          <CIcon
            icon={cilTruck}
            customClassName="nav-icon"
          />,
      }, */
    )
  }


  return nav
}
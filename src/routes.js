import React from 'react'

import Clients
  from './views/admin/clients/Clients'

import Garments
  from './views/admin/garments/Garments'

import Users
  from './views/admin/users/Users'

import OperatorBatches
  from './views/operator/batches/OperatorBatches'

import OperatorBatchDetail
  from './views/operator/batches/OperatorBatchDetail'

import Stock
  from './views/operator/stock/Stock'

import PlantDashboardView
  from './views/dashboard/PlantDashboard'

import ClientDashboardView
  from './views/dashboard/ClientDashboard'

import DriverShiftView
  from './views/driver/shift/DriverShift'

import {
  getCurrentRole,
} from './services/auth.service'

import Vehicles
  from './views/admin/transport/Vehicles'

import DriverShiftHistory
  from './views/admin/transport/DriverShiftHistory'

const role =
  getCurrentRole()


const dashboardElement =
  role === 'client_operator'
    ? ClientDashboardView

    : role === 'transportista'
      ? DriverShiftView

      : PlantDashboardView


export const routes = [

  {
    path: '/',
    exact: true,
    name: 'Home',
  },


  /**
   * Dashboard de entrada según rol.
   */
  {
    path: '/dashboard',
    name: 'Dashboard',
    element: dashboardElement,
  },


  /**
   * ADMIN
   */
  {
    path: '/admin/clients',
    name: 'Clientes',
    element: Clients,
  },

  {
    path: '/admin/garments',
    name: 'Prendas',
    element: Garments,
  },

  {
    path: '/admin/users',
    name: 'Usuarios',
    element: Users,
  },
  {
    path: '/admin/transport/vehicles',
    name: 'Vehículos',
    element: Vehicles,
  },
  {
    path: '/admin/transport/history',
    name: 'Historial transporte',
    element: DriverShiftHistory,
  },

  /**
   * LOTES
   */
  {
    path: '/operator/batches',
    name: 'Recepción de lotes',
    element: OperatorBatches,
  },

  {
    path: '/operator/batches/:id',
    name: 'Detalle de lote',
    element: OperatorBatchDetail,
  },


  /**
   * STOCK
   */
  {
    path: '/operator/stock',
    name: 'Stock actual',
    element: Stock,
  },


  /**
   * DASHBOARDS
   */
  {
    path: '/dashboard/plant',
    name: 'Dashboard Planta',
    element: PlantDashboardView,
  },

  {
    path: '/dashboard/client',
    name: 'Dashboard Cliente',
    element: ClientDashboardView,
  },


  /**
   * TRANSPORTISTA
   */
  {
    path: '/driver/shift',
    name: 'Mi jornada',
    element: DriverShiftView,
  },
]


export default routes
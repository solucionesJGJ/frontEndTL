import React from 'react'
import { useLocation } from 'react-router-dom'

import { routes } from '../routes'

import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'
import { Link } from 'react-router-dom'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => {
      if (!route.path) return false

      const routeParts = route.path.split('/')
      const pathParts = pathname.split('/')

      if (routeParts.length !== pathParts.length) {
        return false
      }

      return routeParts.every((part, index) => {
        return part.startsWith(':') || part === pathParts[index]
      })
    })

    return currentRoute ? currentRoute.name : false
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    location.split('/').reduce((prev, curr, index, array) => {
      const currentPathname = `${prev}/${curr}`
      const routeName = getRouteName(currentPathname, routes)
      routeName &&
        breadcrumbs.push({
          pathname: currentPathname,
          name: routeName,
          active: index + 1 === array.length ? true : false,
        })
      return currentPathname
    })
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)

  return (
    <CBreadcrumb className="my-0">
      <CBreadcrumbItem href={undefined}>
        <Link to="/">Home</Link>
      </CBreadcrumbItem>
      {breadcrumbs.map((breadcrumb, index) => {
        return (
          <CBreadcrumbItem
            {...(breadcrumb.active ? { active: true } : { href: undefined })}
            key={index}
          >
            <Link to={breadcrumb.pathname}>{breadcrumb.name}</Link>
          </CBreadcrumbItem>
        )
      })}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)

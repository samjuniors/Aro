import { describe, expect, it } from 'vitest'

import { ROUTES_AREA, SIDEBAR_NAV_AREA } from '@/app/routes'
import { registry } from '@/contrib/registry'

import {
  ARO_AGENT_ROUTE,
  ARO_AGENTS_ROUTE,
  ARO_DESIGN_ROUTE,
  ARO_DOCTOR_ROUTE,
  ARO_REVIEW_ROUTE,
  ARO_RULES_ROUTE,
  ARO_TASKS_ROUTE,
  ARO_TRANSCRIPT_ROUTE
} from './register'

describe('Aro Registration (register.tsx)', () => {
  it('registers all eight contributed routes in ROUTES_AREA', () => {
    const routeItems = registry.getArea(ROUTES_AREA)
    const paths = routeItems.map(item => (item.data as { path?: string })?.path)

    expect(paths).toContain(ARO_TRANSCRIPT_ROUTE)
    expect(paths).toContain(ARO_REVIEW_ROUTE)
    expect(paths).toContain(ARO_TASKS_ROUTE)
    expect(paths).toContain(ARO_DESIGN_ROUTE)
    expect(paths).toContain(ARO_AGENT_ROUTE)
    expect(paths).toContain(ARO_RULES_ROUTE)
    expect(paths).toContain(ARO_AGENTS_ROUTE)
    expect(paths).toContain(ARO_DOCTOR_ROUTE)
  })

  it('registers all eight sidebar navigation rows in SIDEBAR_NAV_AREA with correct order', () => {
    const navItems = registry.getArea(SIDEBAR_NAV_AREA)

    const aroNavs = navItems.filter(item => {
      const path = (item.data as { path?: string })?.path

      return path ? [
        ARO_TRANSCRIPT_ROUTE,
        ARO_AGENT_ROUTE,
        ARO_REVIEW_ROUTE,
        ARO_TASKS_ROUTE,
        ARO_DESIGN_ROUTE,
        ARO_RULES_ROUTE,
        ARO_AGENTS_ROUTE,
        ARO_DOCTOR_ROUTE
      ].includes(path) : false
    })

    expect(aroNavs.length).toBe(8)

    const transcriptNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_TRANSCRIPT_ROUTE)
    expect(transcriptNav?.order).toBe(50)
    expect((transcriptNav?.data as { label?: string })?.label).toBe('Aro Transcript')

    const bridgeNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_AGENT_ROUTE)
    expect(bridgeNav?.order).toBe(50.5)
    expect((bridgeNav?.data as { label?: string })?.label).toBe('Aro Bridge')

    const reviewNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_REVIEW_ROUTE)
    expect(reviewNav?.order).toBe(51)
    expect((reviewNav?.data as { label?: string })?.label).toBe('Aro Review')

    const tasksNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_TASKS_ROUTE)
    expect(tasksNav?.order).toBe(52)
    expect((tasksNav?.data as { label?: string })?.label).toBe('Aro Tasks')

    const designNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_DESIGN_ROUTE)
    expect(designNav?.order).toBe(53)
    expect((designNav?.data as { label?: string })?.label).toBe('Aro Design')

    const rulesNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_RULES_ROUTE)
    expect(rulesNav?.order).toBe(54)
    expect((rulesNav?.data as { label?: string })?.label).toBe('Aro Rules')

    const agentsNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_AGENTS_ROUTE)
    expect(agentsNav?.order).toBe(55)
    expect((agentsNav?.data as { label?: string })?.label).toBe('Aro Agents')

    const doctorNav = navItems.find(item => (item.data as { path?: string })?.path === ARO_DOCTOR_ROUTE)
    expect(doctorNav?.order).toBe(56)
    expect((doctorNav?.data as { label?: string })?.label).toBe('Aro Doctor')
  })

  it('provides render functions for every contributed route', () => {
    const routeItems = registry.getArea(ROUTES_AREA)

    const aroRoutes = routeItems.filter(item => {
      const path = (item.data as { path?: string })?.path

      return path ? [
        ARO_TRANSCRIPT_ROUTE,
        ARO_REVIEW_ROUTE,
        ARO_TASKS_ROUTE,
        ARO_DESIGN_ROUTE,
        ARO_AGENT_ROUTE,
        ARO_RULES_ROUTE,
        ARO_AGENTS_ROUTE,
        ARO_DOCTOR_ROUTE
      ].includes(path) : false
    })

    for (const route of aroRoutes) {
      expect(typeof route.render).toBe('function')
    }
  })
})

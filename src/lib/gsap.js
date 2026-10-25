/**
 * Central GSAP setup. Import gsap/ScrollTrigger/useGSAP from here so plugins are
 * registered once and every animation shares the same reduced-motion query.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

gsap.defaults({ ease: 'power3.out', duration: 1 })

/** Use with gsap.matchMedia(): animations inside only run when motion is welcome. */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'

export { gsap, ScrollTrigger, useGSAP }

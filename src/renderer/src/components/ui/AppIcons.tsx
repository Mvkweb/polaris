import type { Component, JSX } from 'solid-js'
import { Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import * as Solar from './SolarIcons'
import { prefs } from '../settings/prefs'

/**
 * App-wide UI icons with a switchable set (Settings → Appearance → Interface
 * icons). Every chrome icon goes through here so the two sets never mix.
 *
 * - Solar: 480 Design, CC BY 4.0 (smooth 24px linear).
 * - Dinkie Icons: atelierAnchor, MIT (12px pixel grid). Rendered only at whole
 *   multiples of 12px with crisp edges, so the pixels stay pixels.
 */

export type IconName =
  | 'home'
  | 'documents'
  | 'downloads'
  | 'music'
  | 'pictures'
  | 'videos'
  | 'recent'
  | 'trash'
  | 'drive'
  | 'search'
  | 'note'
  | 'folder'
  | 'settings'
  | 'tuning'
  | 'terminal'
  | 'code'
  | 'info'
  | 'chat'
  | 'ghost'
  | 'restore'
  | 'palette'
  | 'keyboard'
  | 'media'
  | 'upload'
  | 'tasks'
  | 'panel'
  | 'newNote'
  | 'usb'
  | 'source'
  | 'bug'
  | 'sparkles'
  | 'rocket'
  | 'heart'
  | 'nightly'
  | 'stable'

const DINKIE: Record<IconName, string> = {
  home: '<path fill="currentColor" d="M1 12h9V8h1V6h-1v1H1V6H0v2h1Zm0-6h1V5H1Zm1 5V8h7v3H7V9H4v2Zm3 0v-1h1v1ZM2 5h1V4H2Zm7 1h1V1H7v2H3v1h5V2h1v2H8v1h1Zm0 0"/>',
  documents:
    '<path fill="currentColor" d="M0 12h11V4h-1v1H7V2h1V1H0Zm1-1V2h5v4h4v5Zm1-1h4V9H2Zm0-4h3V5H2Zm0 2h7V7H2Zm0-4h3V3H2Zm6-1h1V2H8Zm1 1h1V3H9Zm0 0"/>',
  downloads:
    '<path fill="currentColor" d="M0 12h11V8H6V7h1V6H6V1H5v5H4v1h1v1H0Zm1-1V9h6v1h1V9h2v2Zm2-5h1V5H3ZM2 5h1V4H2Zm5 1h1V5H7Zm1-1h1V4H8Zm0 0"/>',
  music:
    '<path fill="currentColor" d="M0 12h3v-1h1V5h2V4h3v4H7v1h1v1H7V9H6v2h3v-1h1V1H7v1H3v7H1v1h1v1H1v-1H0Zm0 0"/>',
  pictures:
    '<path fill="currentColor" d="M0 12h11V3h-1V2H7v1H4V2H2v1H0Zm1-1V7h3v2h1V6H1V4h7V3h1v1h1v2H8v3h1V7h1v4Zm4-1h3V9H5Zm0-4h3V5H5Zm0 0"/>',
  videos:
    '<path fill="currentColor" d="M0 12h11V1H0Zm1-1v-1h1v1Zm2 0v-1h1v1Zm2 0v-1h1v1Zm2 0v-1h1v1ZM1 3V2h1v1Zm0 6V4h4v5Zm8 2v-1h1v1ZM3 3V2h1v1Zm3 6V4h4v5ZM5 3V2h1v1Zm2 0V2h1v1Zm2 0V2h1v1Zm0 0"/>',
  recent:
    '<path fill="currentColor" d="M5 10h1V6H3v1h2Zm-3 1h1v-1H2Zm-1-1h1V9H1ZM0 9h1V4H0Zm3 3h5v-1H3ZM1 4h1V3H1Zm7 7h1v-1H8Zm1-1h1V9H9ZM2 3h1V2H2Zm4 3h1V5H6Zm1-1h1V4H7Zm3 4h1V4h-1ZM3 2h5V1H3Zm5 1h1V2H8Zm1 1h1V3H9Zm0 0"/>',
  trash:
    '<path fill="currentColor" d="M1 11h9v-1H7V9h3v1h1V4h-1V2H9v2H8V2H7v2H4V2H3v2H2V2H1v2H0v6h1V9h1v1H1Zm0-3V7h1v1Zm2 2V9h1v1ZM1 6V5h1v1Zm2 2V7h1v1Zm2 2V9h1v1ZM3 6V5h1v1Zm2 2V7h1v1Zm0-2V5h1v1Zm2 2V7h3v1ZM2 2h1V1H2Zm5 4V5h3v1Zm1-4h1V1H8Zm0 0"/>',
  drive:
    '<path fill="currentColor" d="M0 12h11V3h-1v8H9V7H2v4H1V2h1v4h6V2h1V1H0Zm3-1V8h5v3Zm0-6V2h1v3Zm2 0V2h2v3Zm4-2h1V2H9Zm0 0"/>',
  search:
    '<path fill="currentColor" d="M8 8H7v1h1Zm0 0h1V3H8ZM1 9h1V8H1ZM0 8h1V3H0Zm2 2h5V9H2Zm0-3h1V4H2Zm1 1h3V7H3Zm4 3h1v-1H7Zm1 1h2v-1H8ZM1 3h1V2H1Zm9 8h1V9h-1ZM3 4h3V3H3Zm3 3h1V4H6Zm3 2h1V8H9ZM2 2h5V1H2Zm5 1h1V2H7Zm0 0"/>',
  note: '<path fill="currentColor" d="M0 12h9v-1H1V2h7v1h1V1H0Zm2-2h2V9H2Zm0-2h2V7H2Zm3 2h3V9H7V8H6V7H5ZM2 6h3V5H2Zm6 3h1V8H8ZM6 7h1V6H6ZM2 4h5V3H2Zm7 4h1V7H9ZM7 6h1V5H7Zm3 1h1V5h-1ZM8 5h2V4H8Zm0 0"/>',
  folder:
    '<path fill="currentColor" d="M0 12h9v-2h1V9H9V6h1V5H8v6H1V2h9V1H0Zm2-4h4V7H2Zm0-2h4V5H2Zm0-2h4V3H2Zm8 5h1V6h-1Zm0-4h1V2h-1Zm0 0"/>',
  settings:
    '<path fill="currentColor" d="M2 12h3v-1h1v1h3v-2h2V7h-1V6h1V3H9V1H6v1H5V1H2v2H0v3h1v1H0v3h2Zm1-1V9H1V8h1V5H1V4h2V2h1v1h3V2h1v2h2v1H9v3h1v1H8v2H7v-1H4v1Zm0-3h1V5H3Zm1 1h3V8H4Zm3-1h1V5H7ZM4 5h3V4H4Zm0 0"/>',
  tuning: '<path fill="currentColor" d="M0 3h11V2H0Zm0 8h11v-1H0Zm0-4h11V6H0Zm0 0"/>',
  terminal:
    '<path fill="currentColor" d="M6 5H5v3h1Zm0 0h1V2H6ZM0 7h1V6H0Zm1 1h1V7H1Zm1 1h1V8H2Zm2 2h1V8H4ZM1 6h1V5H1Zm1-1h1V4H2Zm6 4h1V8H8Zm1-1h1V7H9Zm0-2h1V5H9Zm1 1h1V6h-1ZM8 5h1V4H8Zm0 0"/>',
  code: '<path fill="currentColor" d="M6 5H5v3h1Zm0 0h1V2H6ZM0 7h1V6H0Zm1 1h1V7H1Zm1 1h1V8H2Zm2 2h1V8H4ZM1 6h1V5H1Zm1-1h1V4H2Zm6 4h1V8H8Zm1-1h1V7H9Zm0-2h1V5H9Zm1 1h1V6h-1ZM8 5h1V4H8Zm0 0"/>',
  info: '<path fill="currentColor" d="M4 9h3V8H6V5H4v1h1v2H4Zm-3 1h1V9H1Zm1 1h1v-1H2ZM0 9h1V4H0Zm3 3h5v-1H3Zm5-1h1v-1H8ZM1 4h1V3H1Zm8 6h1V9H9ZM2 3h1V2H2Zm3 1h1V3H5Zm5 5h1V4h-1ZM3 2h5V1H3Zm6 2h1V3H9ZM8 3h1V2H8Zm0 0"/>',
  chat: '<path fill="currentColor" d="M1 12h3v-1H3V9H2v2H1Zm0-3h1V8H1Zm3 2h1v-1H4ZM0 8h1V3H0Zm5 2h4V9H5ZM3 6h1V5H3ZM1 3h1V2H1Zm4 3h1V5H5Zm4 3h1V8H9ZM7 6h1V5H7ZM2 2h7V1H2Zm8 6h1V3h-1ZM9 3h1V2H9Zm0 0"/>',
  ghost:
    '<path fill="currentColor" d="M3 9H0v1h1v1h1v-1h1Zm0 0h1V2H3Zm-1 3h6v-1H2Zm6-1h1v-1H8ZM6 9h1V8h1V7H6Zm3 1h1V9H9ZM6 6h1V4H6Zm2 0h1V4H8Zm2 3h1V3h-1ZM4 2h5V1H4Zm5 1h1V2H9Zm0 0"/>',
  restore:
    '<path fill="currentColor" d="M6 6h1V5h1V4H7V3H6v1H3v1h3Zm-6 5h1V2H0Zm1 1h9v-1H1Zm1-5h1V5H2Zm2 3h1V9h3V8H5V7H4v1H3v1h1Zm4-2h1V6H8Zm2 3h1V2h-1ZM1 2h9V1H1Zm0 0"/>',
  palette:
    '<path fill="currentColor" d="M6 11H4v1h2Zm0 0h1v-1h3V9H6Zm-3 0h1v-1H3Zm-1-1h1V9H2ZM1 9h1V7H1ZM0 7h1V3H0Zm1-4h1V2H1Zm5 5h2V6H7v1H6ZM5 7h1V6h1V5H5ZM2 2h4V1H2Zm8 7h1V6h-1ZM9 6h1V4H9ZM6 3h2V2H6Zm2 1h1V3H8Zm0 0"/>',
  keyboard:
    '<path fill="currentColor" d="M1 3H0v7h1Zm0 0h9V2H1Zm1 6h1V8H2Zm-1 2h9v-1H1Zm2-4h1V6H3Zm1 2h3V8H4ZM2 5h1V4H2Zm3 2h1V6H5ZM4 5h1V4H4Zm4 4h1V8H8ZM7 7h1V6H7ZM6 5h1V4H6Zm4 5h1V3h-1ZM8 5h1V4H8Zm0 0"/>',
  media:
    '<path fill="currentColor" d="M0 12h11V3h-1V2H7v1H4V2H2v1H0Zm1-1V7h3v2h1V6H1V4h7V3h1v1h1v2H8v3h1V7h1v4Zm4-1h3V9H5Zm0-4h3V5H5Zm0 0"/>',
  upload:
    '<path fill="currentColor" d="M2 10h8V9H2ZM1 9h1V8H1ZM0 8h1V5H0Zm1-3h1V4H1Zm1-1h1V3H2Zm1-1h2V2H3Zm2 1h1V3H5Zm5 5h1V6h-1ZM6 5h3V4H6Zm3 1h1V5H9Zm0 0"/>',
  tasks:
    '<path fill="currentColor" d="M4 12h5v-1H8V9h2v1h1V5H9V2H7V1H2v1H0v9h4Zm-3-2V3h1v1h5V3h1v2H4v1H2v1h2v1H2v1h2v1Zm4 1V6h5v2H7v3Zm4 0h1v-1H9ZM3 3V2h3v1Zm0 0"/>',
  panel:
    '<path fill="currentColor" d="M4 3h7V2H4Zm-4 9h2v-2H0Zm0-3h2V7H0Zm0-3h2V4H0Zm4 6h7v-1H4Zm0-3h7V8H4ZM0 3h2V1H0Zm4 3h7V5H4Zm0 0"/>',
  newNote:
    '<path fill="currentColor" d="M0 12h5v-1h1v-1H5V9H4v2H2v-1H1V8h2V7H2V6H1v1H0Zm3-3h1V8H3Zm3 1h1V9H6ZM2 6h1V5H2Zm3 3h1V8H5ZM3 7h1V6H3Zm4 2h1V8H7ZM3 5h1V4H3Zm3 3h1V7H6ZM4 6h1V5H4Zm4 2h1V7H8ZM4 4h1V3H4Zm3 3h1V6H7ZM5 5h1V4H5Zm4 2h1V6H9ZM5 3h1V2H5Zm3 3h1V5H8ZM6 4h1V3H6Zm4 2h1V3h-1v1H9v1h1ZM7 3h1V2h1V1H6v1h1Zm2 0h1V2H9Zm0 0"/>',
  usb: '<path fill="currentColor" d="M3 12h5v-1H6V8h1v2h1v1h1v-1h1V9H9V8H8V7H7V5h1V4h2V3H9V2H8V1H3v1h2v3H4V3H3V2H2v1H1v1h1v1h1v1h1v2H3v1H1v1h1v1h1ZM0 9h1V4H0Zm5-2V6h1v1Zm5 2h1V4h-1Zm0 0"/>',
  source:
    '<path fill="currentColor" d="M2 12h2v-1H3v-1H2V9H1V8h1v1h1v1h1V9h1V8H3V7H2V4h1V2h1v1h3V2h1v2h1v3H8v1H6v1h1v3h2v-1h1v-1h1V3h-1V2H9V1H2v1H1v1H0v7h1v1h1Zm0 0"/>',
  bug: '<path fill="currentColor" d="M7 10H6v1h1Zm0 0h1V9h2V8H8V7h1V6H7Zm-6 2h1v-1H1Zm1-1h1v-1H2Zm3 1h1v-1H5Zm-1-1h1v-1H4Zm-1-1h1V6H2v1h1v1H1v1h2ZM1 6h1V5H1Zm7 5h1v-1H8Zm1 1h1v-1H9ZM1 3h1V2H1Zm3 3h3V4H6v1H5V4H4ZM2 2h2V1H2Zm3 2h1V3H5ZM4 3h1V2H4Zm2 0h1V2H6Zm3 3h1V5H9ZM7 2h2V1H7Zm2 1h1V2H9Zm0 0"/>',
  sparkles:
    '<path fill="currentColor" d="M7 9h1V6H7Zm-4 3h1V9H3ZM1 9h2V8H1Zm2-1h1V6H3Zm1 1h2V8H4ZM1 5h1V3H1ZM0 3h1V2H0Zm2 0h1V2H2ZM1 2h1V1H1Zm3 3h2V4H4Zm2 1h1V5H6Zm2 0h1V5H8ZM6 4h1V3H6Zm2 0h1V3H8Zm1 1h2V4H9ZM7 3h1V1H7Zm0 0"/>',
  rocket:
    '<path fill="currentColor" d="M4 12h1v-1h1v-1h1V7H6v1H5v1H4Zm-4 0h2v-1H1v-1H0Zm2-1h1V9H1v1h1Zm1-2h1V8H3ZM0 8h3V7h1V6h1V5H2v1H1v1H0Zm5-1h1V6H5Zm0-2h1V4H5Zm2 2h1V6H7ZM6 4h1V3H6Zm2 2h1V5H8ZM7 5h1V4H7Zm0-2h1V2H7Zm2 2h1V4H9Zm1-1h1V1H8v1h2ZM8 4h1V3H8Zm0 0"/>',
  heart:
    '<path fill="currentColor" d="M10 6H9v2h1Zm0 0h1V3h-1Zm-6 5h1v-1H4Zm-1-1h1V9H3ZM2 9h1V8H2Zm3 3h1v-1H5ZM1 8h1V6H1ZM0 6h1V3H0Zm6 5h1v-1H6Zm1-1h1V9H7ZM1 3h3V2H1Zm7 6h1V8H8ZM4 4h1V3H4Zm1 1h1V4H5Zm1-1h1V3H6Zm1-1h3V2H7Zm0 0"/>',
  nightly:
    '<path fill="currentColor" d="M6 3h1V2h1V1H5v1h1Zm-5 7h1V9H1Zm1 1h1v-1H2ZM0 9h1V8h1V7H1V6H0Zm3 3h5v-1H3ZM2 9h4V8H2Zm6 2h1v-1H8ZM6 8h1V7H6Zm3 2h1V9H9ZM7 7h1V3H7Zm3 2h1V4h-1ZM8 3h1V2H8Zm1 1h1V3H9Zm0 0"/>',
  stable:
    '<path fill="currentColor" d="M4 5H3v3h1Zm0 0h3V4H4Zm-3 6h1v-1H1Zm1-1h1V9H2Zm3 2h1v-2H5ZM0 7h2V6H0Zm4 2h3V8H4ZM1 3h1V2H1Zm1 1h1V3H2Zm6 6h1V9H8Zm1 1h1v-1H9ZM7 8h1V5H7ZM5 3h1V1H5Zm4 4h2V6H9ZM8 4h1V3H8Zm1-1h1V2H9Zm0 0"/>'
}

const SOLAR_EXTRA: Record<string, string> = {
  'cloud-upload-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M6.28571 19C3.91878 19 2 17.1038 2 14.7647C2 12.4256 3.91878 10.5294 6.28571 10.5294C6.56983 10.5294 6.8475 10.5567 7.11616 10.6089M17.5 18.8722C20.0726 18.3221 22 16.0599 22 13.3529C22 10.8811 20.393 8.78024 18.1551 8.01498C17.5693 7.81468 16.9404 7.70588 16.2857 7.70588C15.6178 7.70588 14.9767 7.81911 14.381 8.02721M7.11616 10.6089C6.88706 9.9978 6.7619 9.33687 6.7619 8.64706C6.7619 5.52827 9.32028 3 12.4762 3C15.4159 3 17.8371 5.19371 18.1551 8.01498M7.11616 10.6089C7.68058 10.7184 8.20528 10.9374 8.66667 11.2426"/><path stroke-linejoin="round" d="M12 16V22M10 18L12 16L14 18"/></g>',
  'checklist-minimalistic-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22Z"/><path stroke-linejoin="round" d="M6 15.8L7.14286 17L10 14"/><path stroke-linejoin="round" d="M6 8.8L7.14286 10L10 7"/><path d="M13 9L18 9"/><path d="M13 16L18 16"/></g>',
  'bug-minimalistic-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M12 22C8.13401 22 5 18.866 5 15V10C5 6.13401 8.13401 3 12 3C15.866 3 19 6.13401 19 10V15C19 18.866 15.866 22 12 22Z"/><path d="M19 13H22"/><path d="M5 13H2"/><path d="M18.7021 7.71909L20.4999 7"/><path d="M5.29785 7.71909L3.50012 7"/><path d="M14.5 3.5L17 2"/><path d="M9.5 3.5L7 2"/><path d="M18.5 18.2002L20.5 19.0002"/><path d="M5.5 18.2002L3.5 19.0002"/><path d="M10.5 10.5H13.5"/><path d="M10.5 15.5H13.5"/></g>',
  'sparkles-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M11.597 10.9016C11.8669 11.386 12.0131 11.5933 12.2123 11.7881C12.4115 11.9829 12.6142 12.1336 13.0985 12.4037L13.5393 12.6495C15.2434 13.5998 16.4286 14.0405 16.4286 14.7853C16.4286 15.5301 15.2434 15.9708 13.5393 16.9211L13.0985 17.167C12.6142 17.437 12.3998 17.592 12.2123 17.7825C12.0248 17.9731 11.8669 18.1846 11.597 18.669L11.3512 19.11C10.4013 20.8147 9.96076 22.0003 9.21627 22.0003C8.47178 22.0003 8.0311 20.8148 7.08116 19.11L6.8354 18.669C6.56546 18.1846 6.37271 17.9453 6.21633 17.7825C6.03141 17.6002 5.81445 17.437 5.33019 17.1669L4.88932 16.9211C3.18522 15.9708 2 15.53 2 14.7853C2 14.0405 3.18522 13.5998 4.88932 12.6495L5.33019 12.4036C5.81444 12.1336 6.05392 11.9709 6.21633 11.788C6.41103 11.6099 6.56545 11.3861 6.8354 10.9016L7.08116 10.4606C8.0311 8.75587 8.47178 7.57031 9.21627 7.57031C9.96076 7.57031 10.4013 8.75587 11.3512 10.4606L11.597 10.9016Z"/><path d="M15.9908 3.38516C16.103 3.58659 16.1638 3.67274 16.2467 3.75375C16.3295 3.83476 16.4138 3.89743 16.6152 4.00971L16.7985 4.11194C17.5071 4.50706 18 4.69033 18 5C18 5.30967 17.5071 5.49294 16.7985 5.88806L16.6152 5.99029C16.4138 6.10257 16.3247 6.16703 16.2467 6.24625C16.1687 6.32547 16.103 6.41341 15.9908 6.61484L15.8886 6.79822C15.4936 7.50704 15.3104 8 15.0008 8C14.6912 8 14.508 7.50704 14.1129 6.79822L14.0107 6.61484C13.8985 6.41341 13.8183 6.31391 13.7533 6.24623C13.6764 6.17041 13.5862 6.10256 13.3848 5.99027L13.2015 5.88805C12.4929 5.49292 12 5.30966 12 4.99998C12 4.69031 12.4929 4.50705 13.2015 4.11192L13.3848 4.0097C13.5862 3.89741 13.6858 3.82975 13.7533 3.75374C13.8343 3.67966 13.8985 3.58659 14.0107 3.38516L14.1129 3.20178C14.508 2.49296 14.6912 2 15.0008 2C15.3104 2 15.4936 2.49296 15.8886 3.20178L15.9908 3.38516Z"/><path d="M20.6605 8.92344C20.7354 9.05772 20.7759 9.11516 20.8311 9.16917C20.8863 9.22317 20.9425 9.26495 21.0768 9.33981L21.199 9.40796C21.6714 9.67138 22 9.79355 22 10C22 10.2064 21.6714 10.3286 21.199 10.592L21.0768 10.6602C20.9425 10.735 20.8831 10.778 20.8311 10.8308C20.7791 10.8836 20.7354 10.9423 20.6605 11.0766L20.5924 11.1988C20.329 11.6714 20.2069 12 20.0005 12C19.7941 12 19.672 11.6714 19.4086 11.1988L19.3405 11.0766C19.2657 10.9423 19.2122 10.8759 19.1689 10.8308C19.1176 10.7803 19.0575 10.735 18.9232 10.6602L18.801 10.592C18.3286 10.3286 18 10.2064 18 9.99999C18 9.79354 18.3286 9.67137 18.801 9.40795L18.9232 9.3398C19.0575 9.26494 19.1239 9.21983 19.1689 9.16916C19.2229 9.11977 19.2657 9.05772 19.3405 8.92344L19.4086 8.80119C19.672 8.32864 19.7941 8 20.0005 8C20.2069 8 20.329 8.32864 20.5924 8.80119L20.6605 8.92344Z"/></g>',
  'rocket-linear':
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.74956 11.7075C5.67492 11.8931 5.63759 12.0767 5.63759 12.2692C5.63759 13.0713 6.285 13.7168 7.5798 15.0077L8.95316 16.3769C10.248 17.6679 10.8954 18.3133 11.6999 18.3133C11.8776 18.3133 12.0477 18.2818 12.2188 18.2188C12.822 17.9966 13.4378 17.3826 14.4466 16.3769L20.2934 10.5476C21.1355 9.70811 21.5565 9.28836 21.7782 8.75458C22 8.2208 22 7.62718 22 6.43993V5.87277C22 4.04713 22 3.13431 21.4311 2.56715C20.8623 2 19.9467 2 18.1156 2H17.5467C16.3559 2 15.7605 2 15.2251 2.2211C14.6897 2.4422 14.2687 2.86195 13.4267 3.70146L7.57981 9.53078C6.59589 10.5117 5.9858 11.12 5.74956 11.7075ZM12.2188 18.2188L12.5 18.5L13.0229 18.9584C13.4463 19.3806 13.658 19.5917 13.8408 19.8249C14.0032 20.0321 14.1483 20.2521 14.2748 20.4828C14.4173 20.7425 14.5279 21.0199 14.749 21.5747C14.9291 22.0263 15.5272 22.1457 15.8746 21.7993L15.9586 21.7155C17.0789 20.5987 18.4237 19.2578 18.6939 18.6106C18.9321 18.0399 19.0114 17.4234 18.923 16.8287C18.8227 16.1545 18.4153 15.5253 17.6005 14.2668L17.1943 13.6395M5.74956 11.7075L5.57332 11.5312L4.61259 10.5734C4.56554 10.5265 4.54201 10.503 4.51839 10.4801C4.07636 10.0512 3.55641 9.7102 2.98636 9.47534C2.95589 9.46279 2.92498 9.45054 2.86314 9.42603L2.48449 9.276C1.97153 9.07274 1.83482 8.41238 2.22514 8.02324C3.34539 6.90638 4.69028 5.56554 5.33941 5.29621C5.91185 5.05869 6.53023 4.97966 7.12664 5.0678C7.80295 5.16775 8.43405 5.57394 9.69627 6.38632L10.3255 6.79129M8.26648 15.6923L10.3265 13.6385M17.1933 9.53078C16.4348 10.287 15.205 10.287 14.4466 9.53078C13.6881 8.77457 13.6881 7.54852 14.4466 6.79231C15.205 6.03611 16.4348 6.03611 17.1933 6.79231C17.9517 7.54852 17.9517 8.77457 17.1933 9.53078Z"/>',
  'heart-linear':
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.96173 18.9108C6.01943 16.5913 2 14 2 9.13704C2 4.2741 7.50016 0.825403 12 5.50057C16.4998 0.825403 22 4.2741 22 9.13704C22 14 17.9806 16.5913 15.0383 18.9108C14 19.7293 13 20.4999 12 20.4999C11 20.4999 10 19.7293 8.96173 18.9108Z"/>',
  'moon-stars-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M19.9 2.30719C19.739 1.8976 19.1615 1.8976 19.0006 2.30719L18.5702 3.40247C18.521 3.52752 18.4224 3.62651 18.2978 3.67583L17.2066 4.1078C16.7985 4.26934 16.7985 4.849 17.2066 5.01054L18.2978 5.44252C18.4224 5.49184 18.521 5.59082 18.5702 5.71587L19.0005 6.81115C19.1615 7.22074 19.739 7.22074 19.9 6.81116L20.3303 5.71587C20.3795 5.59082 20.4781 5.49184 20.6027 5.44252L21.6939 5.01054C22.102 4.849 22.102 4.26934 21.6939 4.1078L20.6027 3.67583C20.4781 3.62651 20.3795 3.52752 20.3303 3.40247L19.9 2.30719ZM16.0326 8.12967C15.8717 7.72009 15.2941 7.72009 15.1332 8.12967L14.9763 8.52902C14.9271 8.65407 14.8285 8.75305 14.7039 8.80237L14.3061 8.95987C13.898 9.12141 13.898 9.70107 14.3061 9.86261L14.7039 10.0201C14.8285 10.0694 14.9271 10.1684 14.9763 10.2935L15.1332 10.6928C15.2941 11.1024 15.8717 11.1024 16.0326 10.6928L16.1895 10.2935C16.2387 10.1684 16.3373 10.0694 16.4619 10.0201L16.8598 9.86261C17.2678 9.70107 17.2678 9.12141 16.8598 8.95987L16.4619 8.80237C16.3373 8.75305 16.2387 8.65407 16.1895 8.52902L16.0326 8.12967Z"/><path stroke-linejoin="round" stroke-width="1.5" d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/></g>',
  'sun-2-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 2V4"/><path d="M12 20V22"/><path d="M4 12L2 12"/><path d="M22 12L20 12"/><path d="M19.7773 4.22217L17.5553 6.25375"/><path d="M4.22266 4.22217L6.44467 6.25375"/><path d="M6.44531 17.5557L4.22309 19.7779"/><path d="M19.7773 19.7778L17.5553 17.5555"/></g>'
}

type SvgProps = JSX.IntrinsicElements['svg']
const SOLAR: Record<IconName, (p: SvgProps) => JSX.Element> = {
  home: Solar.SolarHome2Linear,
  documents: Solar.SolarFileTextLinear,
  downloads: Solar.SolarDownloadCircleLinear,
  music: Solar.SolarMusicNoteLinear,
  pictures: Solar.SolarGalleryLinear,
  videos: Solar.SolarClapperboardLinear,
  recent: Solar.SolarClockCircleLinear,
  trash: Solar.SolarTrashBinTrashLinear,
  drive: Solar.SolarHardDriveLinear,
  search: Solar.SolarMagniferLinear,
  note: Solar.SolarFileTextLinear,
  folder: Solar.SolarFolderLinear,
  settings: Solar.SolarSettingsMinimalisticLinear,
  tuning: Solar.SolarTuningLinear,
  terminal: Solar.SolarProgrammingLinear,
  code: Solar.SolarProgrammingLinear,
  info: Solar.SolarInfoCircleLinear,
  chat: Solar.SolarChatRoundLineLinear,
  ghost: Solar.SolarGhostBold,
  restore: Solar.SolarRestartLinear,
  palette: Solar.SolarPaletteLinear,
  keyboard: Solar.SolarKeyboardLinear,
  media: Solar.SolarGalleryLinear,
  upload: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['cloud-upload-linear']}
      {...p}
    />
  ),
  tasks: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['checklist-minimalistic-linear']}
      {...p}
    />
  ),
  panel: Solar.SolarSidebarMinimalisticLinear,
  newNote: Solar.SolarAddSquareLinear,
  usb: Solar.SolarHardDriveLinear,
  source: Solar.SolarGitBranchLinear,
  bug: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['bug-minimalistic-linear']}
      {...p}
    />
  ),
  sparkles: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['sparkles-linear']}
      {...p}
    />
  ),
  rocket: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['rocket-linear']}
      {...p}
    />
  ),
  heart: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['heart-linear']}
      {...p}
    />
  ),
  nightly: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['moon-stars-linear']}
      {...p}
    />
  ),
  stable: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['sun-2-linear']}
      {...p}
    />
  )
}

/** Pixel size for a Dinkie icon: the nearest whole multiple of its 12px grid. */
const snap = (px: number): number => 12 * Math.max(1, Math.floor(px / 12 + 0.4))

/** Size in px from Tailwind `w-*` classes (w-3.5 → 14, w-[18px] → 18), default 16. */
const sizeFromClass = (cls = ''): number => {
  const arb = /\bw-\[(\d+(?:\.\d+)?)px\]/.exec(cls)
  if (arb) return Number(arb[1])
  const tw = /\bw-(\d+(?:\.\d+)?)\b/.exec(cls)
  return tw ? Number(tw[1]) * 4 : 16
}

export interface UiIconProps {
  name: IconName
  class?: string
  /** px; defaults to the class's `w-*` width */
  size?: number
  /** force a set (previews); otherwise follows the Appearance setting */
  set?: 'solar' | 'dinkie'
}

export const UiIcon: Component<UiIconProps> = (props) => {
  const px = () => props.size ?? sizeFromClass(props.class)
  return (
    <Show
      when={(props.set ?? prefs.uiIcons) === 'dinkie'}
      fallback={
        <Dynamic
          component={SOLAR[props.name]}
          class={props.class}
          aria-hidden="true"
          style={props.size ? { width: `${props.size}px`, height: `${props.size}px` } : undefined}
        />
      }
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        class={`ui-icon-pixel ${props.class ?? ''}`}
        style={{ width: `${snap(px())}px`, height: `${snap(px())}px` }}
        shape-rendering="crispEdges"
        innerHTML={DINKIE[props.name]}
      />
    </Show>
  )
}

/** Drop-in components (`<I.home class="w-3.5 h-3.5" />`) for icon props. */
export const I = Object.fromEntries(
  (Object.keys(DINKIE) as IconName[]).map((name) => [
    name,
    ((p: { class?: string }) => <UiIcon name={name} class={p.class} />) as Component<{
      class?: string
    }>
  ])
) as Record<IconName, Component<{ class?: string }>>

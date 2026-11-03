import type { JSX } from 'solid-js'

// Additional Linear icons below are from the Solar icon set by 480 Design
// (https://www.figma.com/community/file/1166831539721848736), CC BY 4.0
// (https://creativecommons.org/licenses/by/4.0/), via the Iconify `solar`
// collection. Linear 1.5px stroke matches the sidebar's small-icon language.

export function SolarMagniferLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <circle cx="11.5" cy="11.5" r="9.5" />
        <path d="M18.2173 18.2178L21.9999 22.0004" />
      </g>
    </svg>
  )
}

export function SolarTrashBinTrashLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M20.5001 6H3.5" />
        <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" />
        <path d="M9.5 11L10 16" />
        <path d="M14.5 11L14 16" />
        <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" />
      </g>
    </svg>
  )
}

export function SolarFolderLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M18 10L13 10" />
        <path d="M2 6.94975C2 6.06722 2 5.62595 2.06935 5.25839C2.37464 3.64031 3.64031 2.37464 5.25839 2.06935C5.62595 2 6.06722 2 6.94975 2C7.33642 2 7.52976 2 7.71557 2.01738C8.51665 2.09229 9.27652 2.40704 9.89594 2.92051C10.0396 3.03961 10.1763 3.17633 10.4497 3.44975L11 4C11.8158 4.81578 12.2237 5.22367 12.7121 5.49543C12.9804 5.64471 13.2651 5.7626 13.5604 5.84678C14.0979 6 14.6747 6 15.8284 6H16.2021C18.8345 6 20.1506 6 21.0062 6.76946C21.0849 6.84024 21.1598 6.91514 21.2305 6.99383C22 7.84935 22 9.16554 22 11.7979V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V6.94975Z" />
      </g>
    </svg>
  )
}

export function SolarAddFolderLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M10 14H12M12 14H14M12 14V16M12 14V12" />
        <path d="M2 6.94975C2 6.06722 2 5.62595 2.06935 5.25839C2.37464 3.64031 3.64031 2.37464 5.25839 2.06935C5.62595 2 6.06722 2 6.94975 2C7.33642 2 7.52976 2 7.71557 2.01738C8.51665 2.09229 9.27652 2.40704 9.89594 2.92051C10.0396 3.03961 10.1763 3.17633 10.4497 3.44975L11 4C11.8158 4.81578 12.2237 5.22367 12.7121 5.49543C12.9804 5.64471 13.2651 5.7626 13.5604 5.84678C14.0979 6 14.6747 6 15.8284 6H16.2021C18.8345 6 20.1506 6 21.0062 6.76946C21.0849 6.84024 21.1598 6.91514 21.2305 6.99383C22 7.84935 22 9.16554 22 11.7979V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V6.94975Z" />
      </g>
    </svg>
  )
}

export function SolarArchiveLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M9 12C9 11.5341 9 11.3011 9.07612 11.1173C9.17761 10.8723 9.37229 10.6776 9.61732 10.5761C9.80109 10.5 10.0341 10.5 10.5 10.5H13.5C13.9659 10.5 14.1989 10.5 14.3827 10.5761C14.6277 10.6776 14.8224 10.8723 14.9239 11.1173C15 11.3011 15 11.5341 15 12C15 12.4659 15 12.6989 14.9239 12.8827C14.8224 13.1277 14.6277 13.3224 14.3827 13.4239C14.1989 13.5 13.9659 13.5 13.5 13.5H10.5C10.0341 13.5 9.80109 13.5 9.61732 13.4239C9.37229 13.3224 9.17761 13.1277 9.07612 12.8827C9 12.6989 9 12.4659 9 12Z" />
        <path d="M20.5 7V13C20.5 16.7712 20.5 18.6569 19.3284 19.8284C18.1569 21 16.2712 21 12.5 21H11.5C7.72876 21 5.84315 21 4.67157 19.8284C3.5 18.6569 3.5 16.7712 3.5 13V7" />
        <path d="M2 5C2 4.05719 2 3.58579 2.29289 3.29289C2.58579 3 3.05719 3 4 3H20C20.9428 3 21.4142 3 21.7071 3.29289C22 3.58579 22 4.05719 22 5C22 5.94281 22 6.41421 21.7071 6.70711C21.4142 7 20.9428 7 20 7H4C3.05719 7 2.58579 7 2.29289 6.70711C2 6.41421 2 5.94281 2 5Z" />
      </g>
    </svg>
  )
}

export function SolarFileTextLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M6 14.5H14" />
        <path d="M6 18H11.5" />
        <path d="M13 2.2627V5.0003C13 7.35732 13 8.53583 13.7322 9.26806C14.4645 10.0003 15.643 10.0003 18 10.0003H21.58" />
        <path
          stroke-linejoin="round"
          d="M3.17139 3.17157C4.34296 2 6.23851 2 10.0296 2C11.5546 2 12.3173 2.00011 13.0093 2.26562C13.7012 2.53114 14.2651 3.03857 15.3929 4.05365L19.3516 7.61621C20.6558 8.78998 21.3078 9.3774 21.6538 10.1543C21.9998 10.9312 22 11.8079 22 13.5625V14C22 17.7712 22 19.6566 20.8284 20.8281C19.6569 21.9997 17.7712 22 14 22L9.9969 21.9997C6.22761 21.9997 4.34284 21.9997 3.17157 20.8284C2 19.6569 2 17.7712 2 14V9.9982C2 6.22817 2 4.34296 3.17139 3.17157Z"
        />
      </g>
    </svg>
  )
}

export function SolarChatRoundLineLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" />
        <path d="M8 10.5H16" />
        <path d="M8 14H13.5" />
      </g>
    </svg>
  )
}

export function SolarSettingsMinimalisticLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M7.84308 3.80211C9.8718 2.6007 10.8862 2 12 2C13.1138 2 14.1282 2.6007 16.1569 3.80211L16.8431 4.20846C18.8718 5.40987 19.8862 6.01057 20.4431 7C21 7.98943 21 9.19084 21 11.5937V12.4063C21 14.8092 21 16.0106 20.4431 17C19.8862 17.9894 18.8718 18.5901 16.8431 19.7915L16.1569 20.1979C14.1282 21.3993 13.1138 22 12 22C10.8862 22 9.8718 21.3993 7.84308 20.1979L7.15692 19.7915C5.1282 18.5901 4.11384 17.9894 3.55692 17C3 16.0106 3 14.8092 3 12.4063V11.5937C3 9.19084 3 7.98943 3.55692 7C4.11384 6.01057 5.1282 5.40987 7.15692 4.20846L7.84308 3.80211Z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </svg>
  )
}

export function SolarSidebarMinimalisticLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M2 11C2 7.22876 2 5.34315 3.17157 4.17157C4.34315 3 6.22876 3 10 3H14C17.7712 3 19.6569 3 20.8284 4.17157C22 5.34315 22 7.22876 22 11V13C22 16.7712 22 18.6569 20.8284 19.8284C19.6569 21 17.7712 21 14 21H10C6.22876 21 4.34315 21 3.17157 19.8284C2 18.6569 2 16.7712 2 13V11Z" />
        <path d="M15 21L15 3" />
      </g>
    </svg>
  )
}

export function SolarAddSquareLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" />
        <path d="M15 12L12 12M12 12L9 12M12 12L12 9M12 12L12 15" />
      </g>
    </svg>
  )
}

export function SolarDocumentAddBroken(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M18.18 8.03933L18.6435 7.57589C19.4113 6.80804 20.6563 6.80804 21.4241 7.57589C22.192 8.34374 22.192 9.58868 21.4241 10.3565L20.9607 10.82M18.18 8.03933C18.18 8.03933 18.238 9.02414 19.1069 9.89309C19.9759 10.762 20.9607 10.82 20.9607 10.82M20.9607 10.82L16.7001 15.0806C16.4115 15.3692 16.2672 15.5135 16.1081 15.6376C15.9204 15.7839 15.7173 15.9094 15.5025 16.0118C15.3203 16.0986 15.1268 16.1632 14.7396 16.2922L13.5 16.7054L13.099 16.8391L12.6979 16.9728C12.5074 17.0363 12.2973 16.9867 12.1553 16.8447C12.0133 16.7027 11.9637 16.4926 12.0272 16.3021L12.1609 15.901L12.2946 15.5L12.7078 14.2604C12.8368 13.8732 12.9014 13.6797 12.9882 13.4975C13.0906 13.2827 13.2161 13.0796 13.3624 12.8919C13.4865 12.7328 13.6308 12.5885 13.9194 12.2999L18.18 8.03933M13.099 16.8391L12.1609 15.901" />
        <path d="M8 13H10.5" />
        <path d="M8 9H14.5" />
        <path d="M8 17H9.5" />
        <path d="M3 14V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157M4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14M19.8284 20.8284C20.7715 19.8853 20.9554 18.4796 20.9913 16" />
      </g>
    </svg>
  )
}

export function SolarFireMinimalisticBold(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M12 21C16.4183 21 20 17.6439 20 13.504C20 9.76257 17.9654 6.83811 16.562 5.44436C16.3017 5.18584 15.8683 5.30006 15.7212 5.63288C14.9742 7.3229 13.4178 9.75607 11.4286 9.75607C10.1975 9.92086 8.31688 8.86844 9.83483 3.64868C9.97151 3.17868 9.46972 2.80113 9.08645 3.11539C6.9046 4.90436 4 8.51143 4 13.504C4 17.6439 7.58172 21 12 21Z"
      />
    </svg>
  )
}

export function SolarSquareTopUpLineDuotone(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path stroke-linejoin="round" d="M21 3L12 12M12 6.65625V12H17.3438" />
        <path
          d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2"
          opacity=".5"
        />
      </g>
    </svg>
  )
}

export function SolarGhostBold(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M22 19.206V12c0-5.523-4.477-10-10-10S2 6.477 2 12v7.206a1.727 1.727 0 0 0 2.5 1.544a2.89 2.89 0 0 1 2.896.18a2.89 2.89 0 0 0 3.208 0l.353-.234a1.88 1.88 0 0 1 2.086 0l.353.235a2.89 2.89 0 0 0 3.208 0a2.89 2.89 0 0 1 2.897-.18A1.727 1.727 0 0 0 22 19.206M16 10.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5s.448-1.5 1-1.5s1 .672 1 1.5M9 12c.552 0 1-.672 1-1.5S9.552 9 9 9s-1 .672-1 1.5s.448 1.5 1 1.5"
        clip-rule="evenodd"
      />
    </svg>
  )
}

export function SolarStarsMinimalisticBoldDuotone(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="currentColor">
        <path d="M10.0802 7.89712C11.1568 5.96571 11.6952 5 12.5 5C13.3048 5 13.8432 5.96571 14.9198 7.89712L15.1984 8.3968C15.5043 8.94564 15.6573 9.22007 15.8958 9.40114C16.1343 9.5822 16.4314 9.64942 17.0255 9.78384L17.5664 9.90622C19.6571 10.3793 20.7025 10.6158 20.9512 11.4156C21.1999 12.2153 20.4872 13.0487 19.0619 14.7154L18.6932 15.1466C18.2881 15.6203 18.0856 15.8571 17.9945 16.1501C17.9034 16.443 17.934 16.759 17.9953 17.3909L18.051 17.9662C18.2665 20.19 18.3742 21.3019 17.7231 21.7962C17.072 22.2905 16.0932 21.8398 14.1357 20.9385L13.6292 20.7053C13.073 20.4492 12.7948 20.3211 12.5 20.3211C12.2052 20.3211 11.927 20.4492 11.3708 20.7053L10.8643 20.9385C8.90677 21.8398 7.928 22.2905 7.27688 21.7962C6.62575 21.3019 6.7335 20.19 6.94899 17.9662L7.00474 17.3909C7.06597 16.759 7.09659 16.443 7.00548 16.1501C6.91438 15.8571 6.71186 15.6203 6.30683 15.1466L5.93808 14.7154C4.51276 13.0487 3.8001 12.2153 4.04881 11.4156C4.29751 10.6158 5.34288 10.3793 7.43361 9.90622L7.9745 9.78384C8.56862 9.64942 8.86568 9.5822 9.1042 9.40114C9.34272 9.22007 9.4957 8.94565 9.80165 8.3968L10.0802 7.89712Z" />
        <g opacity=".5">
          <path d="M4.86686 2.50065C4.89685 2.39487 5.08518 2.39409 5.11588 2.49967C5.2561 2.98176 5.51583 3.69423 5.90885 4.08463C6.30198 4.47511 7.01662 4.72992 7.49967 4.86686C7.60529 4.8969 7.60596 5.08498 7.50065 5.11588C7.01854 5.25609 6.30519 5.51573 5.91471 5.90885C5.52432 6.30201 5.26941 7.01668 5.13248 7.49967C5.10236 7.60513 4.91547 7.60577 4.88444 7.50065C4.74423 7.01854 4.48362 6.30519 4.09049 5.91471C3.69739 5.52452 2.98355 5.26941 2.50065 5.13248C2.39487 5.10249 2.39409 4.91514 2.49967 4.88444C2.98178 4.74422 3.69419 4.48358 4.08463 4.09049C4.4749 3.69746 4.7299 2.98363 4.86686 2.50065Z" />
          <path d="M18.9997 3.24967C19.4139 3.24967 19.7497 3.58546 19.7497 3.99967V4.24967H19.9997C20.4139 4.24967 20.7497 4.58546 20.7497 4.99967C20.7497 5.41388 20.4139 5.74967 19.9997 5.74967H19.7497V5.99967C19.7497 6.41388 19.4139 6.74967 18.9997 6.74967C18.5855 6.74967 18.2497 6.41388 18.2497 5.99967V5.74967H17.9997C17.5855 5.74967 17.2497 5.41388 17.2497 4.99967C17.2497 4.58546 17.5855 4.24967 17.9997 4.24967H18.2497V3.99967C18.2497 3.58546 18.5855 3.24967 18.9997 3.24967Z" />
        </g>
      </g>
    </svg>
  )
}

export function SolarAddCircleBoldDuotone(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="currentColor">
        <path
          d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
          opacity=".5"
        />
        <path d="M12.75 9C12.75 8.58579 12.4142 8.25 12 8.25C11.5858 8.25 11.25 8.58579 11.25 9L11.25 11.25H9C8.58579 11.25 8.25 11.5858 8.25 12C8.25 12.4142 8.58579 12.75 9 12.75H11.25V15C11.25 15.4142 11.5858 15.75 12 15.75C12.4142 15.75 12.75 15.4142 12.75 15L12.75 12.75H15C15.4142 12.75 15.75 12.4142 15.75 12C15.75 11.5858 15.4142 11.25 15 11.25H12.75V9Z" />
      </g>
    </svg>
  )
}

export function SolarCopyBoldDuotone(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="currentColor">
        <path d="M6.59961 11.3974C6.59961 8.67119 6.59961 7.3081 7.44314 6.46118C8.28667 5.61426 9.64432 5.61426 12.3596 5.61426H15.2396C17.9549 5.61426 19.3125 5.61426 20.1561 6.46118C20.9996 7.3081 20.9996 8.6712 20.9996 11.3974V16.2167C20.9996 18.9429 20.9996 20.306 20.1561 21.1529C19.3125 21.9998 17.9549 21.9998 15.2396 21.9998H12.3596C9.64432 21.9998 8.28667 21.9998 7.44314 21.1529C6.59961 20.306 6.59961 18.9429 6.59961 16.2167V11.3974Z" />
        <path
          d="M4.17157 3.17157C3 4.34315 3 6.22876 3 10V12C3 15.7712 3 17.6569 4.17157 18.8284C4.78913 19.446 5.6051 19.738 6.79105 19.8761C6.59961 19.0353 6.59961 17.8796 6.59961 16.2167V11.3974C6.59961 8.6712 6.59961 7.3081 7.44314 6.46118C8.28667 5.61426 9.64432 5.61426 12.3596 5.61426H15.2396C16.8915 5.61426 18.0409 5.61426 18.8777 5.80494C18.7403 4.61146 18.4484 3.79154 17.8284 3.17157C16.6569 2 14.7712 2 11 2C7.22876 2 5.34315 2 4.17157 3.17157Z"
          opacity=".5"
        />
      </g>
    </svg>
  )
}

export function SolarCheckCircleBoldDuotone(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="currentColor">
        <path
          d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
          opacity=".5"
        />
        <path d="M16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z" />
      </g>
    </svg>
  )
}

export function SolarAltArrowDownLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M19 9L12 15L5 9"
      />
    </svg>
  )
}

export function SolarRefreshCircleBoldDuotone(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="currentColor">
        <circle cx="12" cy="12" r="10" opacity=".5" />
        <path d="M16.6483 10.6963C16.8521 10.7044 17.0441 10.7948 17.1796 10.9473L18.5605 12.502C18.8356 12.8116 18.8076 13.2854 18.498 13.5605C18.1883 13.8356 17.7145 13.8077 17.4394 13.498L17.2821 13.3213C16.8283 15.8445 14.6014 17.751 11.9345 17.751C10.3633 17.7509 8.94529 17.0895 7.95303 16.0322C7.66958 15.7302 7.68423 15.2551 7.98623 14.9717C8.28827 14.6882 8.76332 14.7038 9.04678 15.0059C9.76531 15.7714 10.7918 16.2509 11.9345 16.251C13.7811 16.251 15.3202 14.9995 15.7489 13.3203L15.5194 13.541C15.2207 13.8279 14.7458 13.8183 14.4589 13.5195C14.172 13.2208 14.1816 12.7459 14.4804 12.459L16.0995 10.9043L16.1571 10.8545C16.2964 10.7457 16.4702 10.6892 16.6483 10.6963Z" />
        <path d="M12.0439 6.25C13.6212 6.25007 15.0435 6.92052 16.0331 7.99023C16.3144 8.2943 16.2952 8.7695 15.9911 9.05078C15.6871 9.33171 15.2128 9.31351 14.9315 9.00977C14.2153 8.23556 13.1879 7.75007 12.0439 7.75C10.2064 7.75 8.67087 9.00128 8.24502 10.6836L8.48037 10.459C8.77922 10.1725 9.25421 10.1819 9.54092 10.4805C9.82745 10.7793 9.81801 11.2543 9.51944 11.541L7.89639 13.0967C7.74909 13.2379 7.55047 13.313 7.34659 13.3047C7.14286 13.2963 6.95153 13.2054 6.81631 13.0527L5.43838 11.4971C5.16387 11.187 5.19278 10.7131 5.50283 10.4385C5.81293 10.164 6.28685 10.1929 6.56143 10.5029L6.71377 10.6748C7.16785 8.15565 9.38519 6.25 12.0439 6.25Z" />
      </g>
    </svg>
  )
}

export function ZendeskBadge(props: JSX.IntrinsicElements['span']) {
  return (
    <span
      class="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] bg-[#03363D]/40 border border-[#03363D]/70 shadow-xs shrink-0"
      title="Zendesk"
      {...props}
    >
      <svg viewBox="0 0 24 24" class="w-3 h-3 text-[#1fca9a] fill-current">
        <path d="M11.5 4H4v7.5A7.5 7.5 0 0 0 11.5 4zm1 0a7.5 7.5 0 0 0 7.5 7.5V4h-7.5zm-1 8.5A7.5 7.5 0 0 0 4 20h7.5v-7.5zm1 0V20H20a7.5 7.5 0 0 0-7.5-7.5z" />
      </svg>
    </span>
  )
}

export function SlackBadge(props: JSX.IntrinsicElements['span']) {
  return (
    <span
      class="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] bg-white/[0.05] border border-white/10 shadow-xs shrink-0"
      title="Slack"
      {...props}
    >
      <svg viewBox="0 0 24 24" class="w-3.5 h-3.5">
        <path
          d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
          fill="#E01E5A"
        />
        <path
          d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
          fill="#36C5F0"
        />
        <path
          d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
          fill="#2EB67D"
        />
        <path
          d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
          fill="#ECB22E"
        />
      </svg>
    </span>
  )
}

export function FigmaBadge(props: JSX.IntrinsicElements['span']) {
  return (
    <span
      class="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] bg-white/[0.05] border border-white/10 shadow-xs shrink-0"
      title="Figma"
      {...props}
    >
      <svg viewBox="0 0 38 57" class="w-2.5 h-3.5">
        <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
        <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
        <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
        <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
        <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
      </svg>
    </span>
  )
}

export function LinearBadge(props: JSX.IntrinsicElements['span']) {
  return (
    <span
      class="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 shadow-xs shrink-0"
      title="Linear"
      {...props}
    >
      <svg viewBox="0 0 100 100" class="w-3 h-3 text-[#7B88EE] fill-current">
        <path d="M1.229 54.127l44.644 44.644a49.98 49.98 0 0 1-19.006-8.156L2.348 66.096a49.882 49.882 0 0 1-1.119-11.969zm1.378-14.735A50.04 50.04 0 0 1 17.514 17.514L82.486 82.486a50.04 50.04 0 0 1-21.878 14.907L2.607 39.392zm16.486-21.878A49.98 49.98 0 0 1 37.099 9.358l53.543 53.543a49.882 49.882 0 0 1-1.119 11.969L19.093 17.514zm26.78-7.917A49.77 49.77 0 0 1 54.127 1.23l44.644 44.644a49.882 49.882 0 0 1-8.156 19.006L45.873 9.597z" />
      </svg>
    </span>
  )
}

export function NotionBadge(props: JSX.IntrinsicElements['span']) {
  return (
    <span
      class="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] bg-white/[0.05] border border-white/10 shadow-xs shrink-0"
      title="Notion"
      {...props}
    >
      <svg viewBox="0 0 24 24" class="w-3 h-3 text-white/90 fill-current">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.69c-.42-.326-.98-.7-2.054-.607L3.106 2.057c-.466.046-.56.326-.373.513l1.726 1.638zm.746 3.498v13.084c0 .793.373 1.072 1.213.98l14.195-.84c.84-.047.933-.513.933-1.166V6.773c0-.653-.28-.933-.84-.886L5.88 6.727c-.56.047-.674.327-.674.98zm11.942.84l.047 11.205c0 .42-.187.56-.56.56-.28 0-.467-.094-.653-.327l-5.69-8.49v8.07c0 .513-.233.746-.746.746h-.653c-.467 0-.607-.233-.607-.746V8.92c0-.42.187-.607.607-.607.373 0 .606.14.793.42l5.643 8.35v-7.93c0-.513.234-.746.747-.746h.473c.466 0 .606.233.606.746z" />
      </svg>
    </span>
  )
}

export function SolarPlayBold(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M20.4086 10.6076C21.5283 11.2268 21.5283 12.7732 20.4086 13.3924L6.90858 20.8439C5.83008 21.4391 4.5 20.6784 4.5 19.4515L4.5 4.54848C4.5 3.3216 5.83008 2.56088 6.90858 3.15611L20.4086 10.6076Z"
      />
    </svg>
  )
}

export function SolarPauseBold(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M6 5C6 3.89543 6.89543 3 8 3C9.10457 3 10 3.89543 10 5V19C10 20.1046 9.10457 21 8 21C6.89543 21 6 20.1046 6 19V5ZM14 5C14 3.89543 14.8954 3 16 3C17.1046 3 18 3.89543 18 5V19C18 20.1046 17.1046 21 16 21C14.8954 21 14 20.1046 14 19V5Z"
      />
    </svg>
  )
}

export function SolarGitBranchLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M9 4.5C9 5.88071 7.88071 7 6.5 7C5.11929 7 4 5.88071 4 4.5C4 3.11929 5.11929 2 6.5 2C7.88071 2 9 3.11929 9 4.5Z" />
        <path d="M20.1821 7.5C20.1821 8.88071 19.0628 10 17.6821 10C16.3014 10 15.1821 8.88071 15.1821 7.5C15.1821 6.11929 16.3014 5 17.6821 5C19.0628 5 20.1821 6.11929 20.1821 7.5Z" />
        <path d="M9 19.5C9 20.8807 7.88071 22 6.5 22C5.11929 22 4 20.8807 4 19.5C4 18.1193 5.11929 17 6.5 17C7.88071 17 9 18.1193 9 19.5Z" />
        <path d="M6.5 17L6.5 7" />
        <path d="M17.6821 10C17.6821 12.3383 15.4514 13.5914 12.0878 13.5914C8.72419 13.5914 6.5 14.6747 6.5 17" />
      </g>
    </svg>
  )
}

export function SolarProgrammingLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" />
        <path d="M17 15H14.5H12" />
        <path d="M7 10L7.2344 10.1953C8.51608 11.2634 9.15693 11.7974 9.15693 12.5C9.15693 13.2026 8.51608 13.7366 7.2344 14.8047L7 15" />
      </g>
    </svg>
  )
}

export function SolarAltArrowLeftLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M15 19L9 12L15 5"
      />
    </svg>
  )
}

export function SolarTuningLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M4 8H11M15 8H20M11 6V10" />
        <path d="M4 16H9M13 16H20M9 14V18" />
      </g>
    </svg>
  )
}

export function SolarPaletteLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <path d="M2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12C21.5 14.636 20.4268 17.0211 18.6893 18.7381C17.8188 19.5982 16.6341 20.0886 15.4057 20.0381C14.0754 19.9835 13 18.9048 13 17.5739C13 16.6322 12.3718 15.808 11.4552 15.5861C10.7412 15.4132 10 15.7077 10 16.4428C10 17.4722 9.47957 18.4239 8.57793 18.9177C7.29139 19.6225 5.8679 20.0833 4.4172 20.2694C3.29813 20.4129 2.5 19.4674 2.5 18.3376V12Z" />
        <circle cx="7.5" cy="9.5" r="1.25" fill="currentColor" />
        <circle cx="12" cy="7" r="1.25" fill="currentColor" />
        <circle cx="16.5" cy="9.5" r="1.25" fill="currentColor" />
        <circle cx="16" cy="14.5" r="1.25" fill="currentColor" />
      </g>
    </svg>
  )
}

export function SolarKeyboardLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
        <circle cx="6.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="10.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="14.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="17.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="6.5" cy="13.5" r="1" fill="currentColor" />
        <path d="M10.5 13.5H17.5" />
      </g>
    </svg>
  )
}

export function SolarRestartLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      >
        <path d="M19.7285 10.9288C20.4413 13.5978 19.7507 16.5535 17.6569 18.6473C14.5327 21.7715 9.46734 21.7715 6.34315 18.6473C3.21895 15.5231 3.21895 10.4578 6.34315 7.33359C9.46734 4.2094 14.5327 4.2094 17.6569 7.33359L19.5 9.17676M19.5 9.17676V4.5M19.5 9.17676H14.8232" />
      </g>
    </svg>
  )
}

export function SolarWindowFrameLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </g>
    </svg>
  )
}

export function SolarAltArrowRightLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M9 5L15 12L9 19"
      />
    </svg>
  )
}

export function SolarGitForkLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      >
        <circle cx="12" cy="18" r="2.5" />
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M18 8.5v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2" />
        <path d="M12 12.5v3" />
      </g>
    </svg>
  )
}

export function SolarFolderTreeLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      >
        <path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" />
        <path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" />
        <path d="M3 5a2 2 0 0 0 2 2h3" />
        <path d="M3 3v13a2 2 0 0 0 2 2h3" />
      </g>
    </svg>
  )
}

export function SolarLayersLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      >
        <path d="M2 17L12 22L22 17" />
        <path d="M2 12L12 17L22 12" />
        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
      </g>
    </svg>
  )
}

export function SolarInfoCircleLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8V8.01M12 11V16" stroke-linejoin="round" />
      </g>
    </svg>
  )
}

export function AkarIconsGithubFill(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12"
        clip-rule="evenodd"
      />
    </svg>
  )
}

export function SimpleIconsGitignoredotio(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M15.08 7.143c-.958.57-1.977 1.065-3.743 1.02c-2.082 0-3.55 1.11-3.55 2.91c0 1.035.405 1.74 1.409 2.28c-.57.36-.884.93-.884 1.516c0 .84.719 1.575 2.456 1.575h1.257c.794 0 1.153.33 1.153.795c0 .525-.344.915-1.841.915c-1.513 0-1.812-.315-1.812-1.005H7.428c0 1.575.794 2.565 3.849 2.565c2.815 0 4.252-1.005 4.252-2.64c0-1.335-1.183-2.31-3.024-2.31h-1.318c-.764 0-.869-.24-.869-.48c0-.18.09-.36.255-.45c.284.06.584.09.928.09c2.052 0 3.37-1.125 3.37-2.67c0-1.036-.54-1.62-1.543-2.056c1.003 0 1.737-.09 2.291-.315zm-3.683 2.565c.793 0 1.212.42 1.212 1.305c0 .915-.434 1.395-1.212 1.395c-.734 0-1.213-.495-1.213-1.365c0-.825.464-1.335 1.213-1.335m9.135-5.423c-.826 0-1.412.588-1.412 1.341c0 .77.586 1.342 1.412 1.342s1.396-.573 1.396-1.341c0-.754-.57-1.341-1.396-1.341zm1.426 4.19h-4.55v1.627h2.178v4.747h-2.253v1.627H24V14.85h-2.042zM3.933 13.933l1.02 1.02l-2.477 2.476l-.62-.62v-.8zm-2.695-.219v2.477L0 14.952zm2.257-.219l-1.638 1.639v-2.039l.619-.619l1.019 1.02z"
      />
    </svg>
  )
}

export function SolarCheckLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 12.6111L8.92308 17.5L20 6.5" />
    </svg>
  )
}

export function SolarRotateCcwLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75">
        <path d="M4.5 10A8 8 0 1 0 7 5.3" />
        <path d="M4 4.5V10H9.5" />
      </g>
    </svg>
  )
}

export function SolarAltArrowUpLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 15L12 9L5 15" />
    </svg>
  )
}

export function SolarCornerDownLeftLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 10L4 15M4 15L9 20M4 15H14C17.3137 15 20 12.3137 20 9V4" />
    </svg>
  )
}

export function SolarBackspaceLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M7.747 4.225A2 2 0 0 1 9.324 3.5H20a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H9.324a2 2 0 0 1-1.577-.725L2.2 12.725a1 1 0 0 1 0-1.45l5.547-7.05ZM17 9l-6 6M11 9l6 6" />
    </svg>
  )
}

export function SolarClockCircleLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5V12L15.5 14" />
    </svg>
  )
}

export function SolarAppWindowLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <path d="M3.49609 9L20.4961 9" />
      <circle cx="6" cy="6" r="0.8" fill="currentColor" />
      <circle cx="9" cy="6" r="0.8" fill="currentColor" />
      <circle cx="12" cy="6" r="0.8" fill="currentColor" />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  )
}

export function SolarHome2Linear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <path d="M2 12.204c0-2.289 0-3.433.52-4.381c.518-.949 1.467-1.582 3.364-2.847l2.857-1.905C10.124 2.15 10.815 1.71 11.572 1.55c.757-.16 1.54-.08 2.856.721l2.857 1.905c1.897 1.265 2.846 1.898 3.365 2.847c.52.948.52 2.092.52 4.381v3.296c0 3.771 0 5.657-1.172 6.828C18.828 22.65 16.941 22.65 13.17 22.65h-2.34c-3.772 0-5.657 0-6.829-1.171C2.83 20.307 2.83 18.421 2.83 14.65v-2.446Z" />
      <path d="M10 22.5V17c0-.943 0-1.414.293-1.707C10.586 15 11.057 15 12 15s1.414 0 1.707.293c.293.293.293.764.293 1.707v5.5" />
    </svg>
  )
}

export function SolarMonitorLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="14" rx="3" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

export function SolarDownloadCircleLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M16 11L12 15L8 11" />
      <path d="M12 7V14.5" />
    </svg>
  )
}

export function SolarHardDriveLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <path d="M5 13L7 5.8C7.3 4.7 8.2 4 9.3 4H14.7C15.8 4 16.7 4.7 17 5.8L19 13" />
      <rect x="2.5" y="13" width="19" height="7.5" rx="2.5" />
      <circle cx="17.5" cy="16.75" r="0.75" fill="currentColor" />
    </svg>
  )
}

export function SolarBookmarkLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <path d="M4 19.5V6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v13.5l-8-4.5-8 4.5Z" />
    </svg>
  )
}

export function SolarMusicNoteLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

export function SolarGalleryLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

export function SolarClapperboardLinear(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2 9.5h20M7 4l2.5 5.5M14 4l2.5 5.5" />
    </svg>
  )
}

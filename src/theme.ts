import { extendTheme } from "@mui/joy/styles";
import "@fontsource/pt-sans";

declare module "@mui/joy/styles" {
  // No custom tokens found, you can skip the theme augmentation.
}

const theme1 = extendTheme({
  fontFamily: {
    body: 'PT Sans, var(--joy-fontFamily-fallback, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol")'
  },
  colorSchemes: {
    light: {
      palette: {
        "background": {
          "body": "var(--joy-palette-neutral-50)"
        }
      }
    },
    dark: {
      palette: {
        primary: {
          "50": "#e1f5fe",
          "100": "#b3e5fc",
          "200": "#81d4fa",
          "300": "#4fc3f7",
          "400": "#29b6f6",
          "500": "#03a9f4",
          "600": "#039be5",
          "700": "#0288d1",
          "800": "#0277bd",
          "900": "#01579b"
        },
        neutral: {
          "50": "#fafaf9",
          "100": "#f5f5f4",
          "200": "#e7e5e4",
          "300": "#d6d3d1",
          "400": "#a8a29e",
          "500": "#78716c",
          "600": "#57534e",
          "700": "#44403c",
          "800": "#292524",
          "900": "#1c1917"
        },
        danger: {
          "50": "#ffebee",
          "100": "#ffcdd2",
          "200": "#ef9a9a",
          "300": "#e57373",
          "400": "#ef5350",
          "500": "#f44336",
          "600": "#e53935",
          "700": "#d32f2f",
          "800": "#c62828",
          "900": "#b71c1c"
        },
        success: {
          "50": "#f7fee7",
          "100": "#ecfccb",
          "200": "#d9f99d",
          "300": "#bef264",
          "400": "#a3e635",
          "500": "#84cc16",
          "600": "#65a30d",
          "700": "#4d7c0f",
          "800": "#3f6212",
          "900": "#365314"
        },
        warning: {
          "50": "#fefce8",
          "100": "#fef9c3",
          "200": "#fef08a",
          "300": "#fde047",
          "400": "#facc15",
          "500": "#eab308",
          "600": "#ca8a04",
          "700": "#a16207",
          "800": "#854d0e",
          "900": "#713f12"
        },
        "background": {
          "body": "var(--joy-palette-neutral-900)"
        }
      }
    }
  }
});

// const githubTheme = extendTheme({
//   colorSchemes: {
//     light: {
//       palette: {
//         success: {
//           solidBg: '#2DA44E',
//           solidHoverBg: '#2C974B',
//           solidActiveBg: '#298E46',
//         },
//         neutral: {
//           outlinedBg: '#F6F8FA',
//           outlinedHoverBg: '#F3F4F6',
//           outlinedActiveBg: 'rgba(238, 239, 242, 1)',
//           outlinedBorder: 'rgba(27, 31, 36, 0.15)',
//         },
//         focusVisible: 'rgba(3, 102, 214, 0.3)',
//       },
//     },
//   },
//   focus: {
//     default: {
//       outlineWidth: '3px',
//     },
//   },
//   fontFamily: {
//     body: 'SF Pro Text, var(--gh-fontFamily-fallback)',
//   },
//   components: {
//     JoyButton: {
//       styleOverrides: {
//         root: ({ ownerState }) => ({
//           borderRadius: '6px',
//           boxShadow: '0 1px 0 0 rgba(27, 31, 35, 0.04)',
//           transition: '80ms cubic-bezier(0.33, 1, 0.68, 1)',
//           transitionProperty: 'color,background-color,box-shadow,border-color',
//           ...(ownerState.size === 'md' && {
//             fontWeight: 600,
//             minHeight: '32px',
//             fontSize: '14px',
//             '--Button-paddingInline': '1rem',
//           }),
//           ...(ownerState.color === 'success' &&
//             ownerState.variant === 'solid' && {
//               '--gh-palette-focusVisible': 'rgba(46, 164, 79, 0.4)',
//               border: '1px solid rgba(27, 31, 36, 0.15)',
//               '&:active': {
//                 boxShadow: 'inset 0px 1px 0px rgba(20, 70, 32, 0.2)',
//               },
//             }),
//           ...(ownerState.color === 'neutral' &&
//             ownerState.variant === 'outlined' && {
//               '&:active': {
//                 boxShadow: 'none',
//               },
//             }),
//         }),
//       },
//     },
//   },
// });

// const fluentTheme = extendTheme({
//   colorSchemes: {
//     light: {
//       palette: {
//         primary: {
//           solidBg: '#0078D4',
//           solidHoverBg: '#106EBE',
//           solidActiveBg: '#005A9E',
//           solidDisabledBg: '#F3F2F1',
//           solidDisabledColor: '#A19F9D',
//         },
//         neutral: {
//           outlinedBg: '#fff',
//           outlinedColor: '#201F1E',
//           outlinedDisabledBg: '#F3F2F1',
//           outlinedDisabledColor: '#A19F9D',
//           outlinedDisabledBorder: '#C8C6C4',
//           outlinedBorder: '#8A8886',
//           outlinedHoverBg: '#F3F2F1',
//           outlinedHoverBorder: undefined,
//           outlinedActiveBg: '#EDEBE9',
//         },
//         focusVisible: '#323130',
//       },
//     },
//   },
//   focus: {
//     default: {
//       outlineOffset: -1,
//       outlineWidth: '1px',
//     },
//   },
//   fontFamily: {
//     body: '"Segoe UI Variable", var(--fluent-fontFamily-fallback)',
//   },
//   components: {
//     JoyButton: {
//       styleOverrides: {
//         root: ({ ownerState }) => ({
//           '--Button-iconOffsetStep': 0,
//           ...(ownerState.variant === 'solid' && {
//             '&.Mui-focusVisible, &:focus-visible': {
//               outlineOffset: '-3px',
//               outlineColor: '#fff',
//             },
//           }),
//           ...(ownerState.variant === 'outlined' && {
//             '&.Mui-focusVisible, &:focus-visible': {
//               outlineOffset: '-3px',
//             },
//           }),
//           ...(ownerState.size === 'md' && {
//             '--Icon-fontSize': '20px',
//             fontSize: '14px',
//             fontWeight: 600,
//             minHeight: '32px',
//             borderRadius: '2px',
//             paddingLeft: 20,
//             paddingRight: 20,
//           }),
//         }),
//       },
//     },
//   },
// });

// const chakraTheme = extendTheme({
//   colorSchemes: {
//     light: {
//       palette: {
//         primary: {
//           solidBg: '#319795',
//           solidHoverBg: '#2C7A7B',
//           solidActiveBg: '#285E61',
//           outlinedColor: '#2C7A7B',
//           outlinedBorder: '#2C7A7B',
//           outlinedHoverBorder: undefined,
//           outlinedHoverBg: '#E6FFFA',
//           outlinedActiveBg: '#B2F5EA',
//         },
//         focusVisible: 'rgba(66, 153, 225, 0.6)',
//       },
//     },
//   },
//   focus: {
//     default: {
//       outlineWidth: '3px',
//     },
//   },
//   fontFamily: {
//     body: 'Inter, var(--chakra-fontFamily-fallback)',
//   },
//   components: {
//     JoyButton: {
//       styleOverrides: {
//         root: ({ theme, ownerState }) => ({
//           '&:focus': theme.focus.default,
//           fontWeight: 600,
//           ...(ownerState.size === 'md' && {
//             borderRadius: '0.375rem',
//             paddingInline: '1rem',
//           }),
//         }),
//       },
//     },
//   },
// });

// const mantineTheme = extendTheme({
//   colorSchemes: {
//     light: {
//       palette: {
//         primary: {
//           solidBg: '#228be6',
//           solidHoverBg: '#1c7ed6',
//           solidActiveBg: undefined,
//           softColor: '#228be6',
//           softBg: 'rgba(231, 245, 255, 1)',
//           softHoverBg: 'rgba(208, 235, 255, 0.65)',
//           softActiveBg: undefined,
//           outlinedColor: '#228be6',
//           outlinedBorder: '#228be6',
//           outlinedHoverBg: 'rgba(231, 245, 255, 0.35)',
//           outlinedHoverBorder: undefined,
//           outlinedActiveBg: undefined,
//         },
//       },
//     },
//   },
//   fontFamily: {
//     body: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji',
//   },
//   focus: {
//     default: {
//       outlineWidth: '2px',
//       outlineOffset: '2px',
//       outlineColor: '#339af0',
//     },
//   },
//   components: {
//     JoyButton: {
//       styleOverrides: {
//         root: ({ ownerState }) => ({
//           transition: 'initial',
//           borderRadius: '4px',
//           fontWeight: 600,
//           ...(ownerState.size === 'md' && {
//             minHeight: '36px',
//             fontSize: '14px',
//             paddingInline: '18px',
//           }),
//           '&:active': {
//             transform: 'translateY(1px)',
//           },
//         }),
//       },
//     },
//   },
// });

// const theme2 = extendTheme({
//   "colorSchemes": {
//     "light": {
//       "palette": {
//         "neutral": {
//           "50": "#f0f9ff",
//           "100": "#e0f2fe",
//           "200": "#bae6fd",
//           "300": "#7dd3fc",
//           "400": "#38bdf8",
//           "500": "#0ea5e9",
//           "600": "#0284c7",
//           "700": "#0369a1",
//           "800": "#075985",
//           "900": "#0c4a6e"
//         }
//       }
//     },
//     "dark": {
//       "palette": {
//         "neutral": {
//           "50": "#f0f9ff",
//           "100": "#e0f2fe",
//           "200": "#bae6fd",
//           "300": "#7dd3fc",
//           "400": "#38bdf8",
//           "500": "#0ea5e9",
//           "600": "#0284c7",
//           "700": "#0369a1",
//           "800": "#075985",
//           "900": "#0c4a6e"
//         }
//       }
//     }
//   }
// })

// const theme = extendTheme({
//   "colorSchemes": {
//     "light": {
//       "palette": {}
//     },
//     "dark": {
//       "palette": {
//         "primary": {
//           "50": "#eff6ff",
//           "100": "#dbeafe",
//           "200": "#bfdbfe",
//           "300": "#93c5fd",
//           "400": "#60a5fa",
//           "500": "#3b82f6",
//           "600": "#2563eb",
//           "700": "#1d4ed8",
//           "800": "#1e40af",
//           "900": "#1e3a8a"
//         },
//         "neutral": {
//           "50": "#fafafa",
//           "100": "#f5f5f5",
//           "200": "#e5e5e5",
//           "300": "#d4d4d4",
//           "400": "#a3a3a3",
//           "500": "#737373",
//           "600": "#525252",
//           "700": "#404040",
//           "800": "#262626",
//           "900": "#171717"
//         },
//         "danger": {
//           "50": "#fef2f2",
//           "100": "#fee2e2",
//           "200": "#fecaca",
//           "300": "#fca5a5",
//           "400": "#f87171",
//           "500": "#ef4444",
//           "600": "#dc2626",
//           "700": "#b91c1c",
//           "800": "#991b1b",
//           "900": "#7f1d1d"
//         },
//         "success": {
//           "50": "#f7fee7",
//           "100": "#ecfccb",
//           "200": "#d9f99d",
//           "300": "#bef264",
//           "400": "#a3e635",
//           "500": "#84cc16",
//           "600": "#65a30d",
//           "700": "#4d7c0f",
//           "800": "#3f6212",
//           "900": "#365314"
//         },
//         "warning": {
//           "50": "#fff7ed",
//           "100": "#ffedd5",
//           "200": "#fed7aa",
//           "300": "#fdba74",
//           "400": "#fb923c",
//           "500": "#f97316",
//           "600": "#ea580c",
//           "700": "#c2410c",
//           "800": "#9a3412",
//           "900": "#7c2d12"
//         },
//         "background": {
//           "body": "var(--joy-palette-neutral-900)"
//         }
//       }
//     }
//   }
// })

export default theme1;

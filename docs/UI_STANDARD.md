# ApuLab Station · UI Standard

This document defines the canonical visual language derived from Mission 01 V50/V51. Menus, HUDs, modals, dialogs, and future missions should reuse these tokens and geometry rather than introducing unrelated styles per screen.

## Palette

### Base
- `#0B0E26` night
- `#141938` deep
- `#2D2654` panel
- `#3B326B` raised panel
- `#4D4288` purple border/shadow
- `#8E7DCE` lavender

### Primary action
- `#F4C75E` yellow
- `#F7D06F` hover
- `#DDB047` pressed
- `#D5A43D` shadow
- `#FFE5A3` auxiliary highlight/border

### Secondary action
- `#6960B8` utility dark
- `#776EC4` hover
- `#5A51A7` pressed
- `#9284D2` utility light
- `#9F92DB` light hover
- `#8072C4` light pressed

### Cyan
- `#49C9D7` cyan
- `#5FD3DF` hover
- `#269AAA` shadow
- `#A8EDF1` light

### Text
- `#FFFFFF` white
- `#F8F9FA` soft white
- `#B8C2CC` muted
- `#17133A` dark text / dark outline

## Standard button

The canonical reference is the Mission 01 **EXPLORAR / GUÍA** (Explore / Guide) control family.

- border: `2px solid #17133A`
- radius: `4px`
- shadow: solid offset, normally `5px 5px 0`
- typography: Poppins normal, 700
- no blurred shadows
- no floating/lift effect on hover
- pressed state: `translate(3px, 3px)` with reduced `2px 2px 0` shadow
- primary actions: solid yellow
- secondary actions: solid purple
- simple triangle on the left for executable actions

The menu may increase button width or height, but it should preserve this geometry and interaction behavior.

## Standard text box / panel

- main background: `#3B326B`
- border: `2px solid #17133A`
- radius: `4px`
- shadow: `6px 6px 0 #6960B8`
- title: white, Poppins 700/800
- body: `#F8F9FA`, Poppins 500
- do not use glassmorphism, strong blur, 20–36 px radii, or diffuse shadows as the primary visual language

Internal panels may use `#2D2654` with `#4D4288` shadow.

## Inputs

- light background: `#F4EEFF`
- dark border: `#17133A`
- radius: `4px`
- text: `#17133A`
- focus indicated with cyan without changing component geometry

## Components covered by this standard

- `MenuScreen`
- `AccessModal`
- `IntroOverlay`
- Mission 01 and future mission HUDs
- guide boxes
- explanation boxes
- success/logbook popups
- forms and nickname fields

## Permanent rule

Do not introduce a new button or panel style for an individual scene. Reuse `tokens.css` and `game-ui.css` first; if a required variant is missing, add it to the shared system and document it here.

# ApuLab Station · UI Standard

Este documento fija el lenguaje visual canónico derivado de Misión 01 V50/V51. Menú, HUD, modales, diálogos y futuras misiones deben reutilizar estos tokens y geometría; no crear estilos alternativos por pantalla.

## Paleta

### Base
- `#0B0E26` night
- `#141938` deep
- `#2D2654` panel
- `#3B326B` raised panel
- `#4D4288` purple border/shadow
- `#8E7DCE` lavender

### Acción principal
- `#F4C75E` yellow
- `#F7D06F` hover
- `#DDB047` pressed
- `#D5A43D` shadow
- `#FFE5A3` highlight/border auxiliar

### Acción secundaria
- `#6960B8` utility dark
- `#776EC4` hover
- `#5A51A7` pressed
- `#9284D2` utility light
- `#9F92DB` light hover
- `#8072C4` light pressed

### Cian
- `#49C9D7` cyan
- `#5FD3DF` hover
- `#269AAA` shadow
- `#A8EDF1` light

### Texto
- `#FFFFFF` white
- `#F8F9FA` soft white
- `#B8C2CC` muted
- `#17133A` dark text / dark outline

## Botón estándar

La referencia es EXPLORAR / GUÍA de Misión 01.

- borde: `2px solid #17133A`
- radio: `4px`
- sombra: desplazada sólida, normalmente `5px 5px 0`
- tipografía: Poppins normal, 700
- sin sombras borrosas
- sin efecto de flotación al hover
- pressed: `translate(3px, 3px)` y sombra reducida `2px 2px 0`
- acciones principales: amarillo sólido
- acciones secundarias: morado sólido
- triángulo simple a la izquierda para acciones ejecutables

El menú puede aumentar ancho/alto, pero no debe cambiar esta geometría ni el comportamiento.

## Caja de texto / panel estándar

- fondo principal: `#3B326B`
- borde: `2px solid #17133A`
- radio: `4px`
- sombra: `6px 6px 0 #6960B8`
- título: blanco, Poppins 700/800
- cuerpo: `#F8F9FA`, Poppins 500
- no usar glassmorphism, blur fuerte, bordes de 20–36 px ni sombras difusas como lenguaje principal

Paneles internos pueden usar `#2D2654` con sombra `#4D4288`.

## Inputs

- fondo claro `#F4EEFF`
- borde oscuro `#17133A`
- radio `4px`
- texto `#17133A`
- foco marcado con cian, sin cambiar de geometría

## Componentes afectados

- `MenuScreen`
- `AccessModal`
- `IntroOverlay`
- HUD de Misión 01 y posteriores
- cajas de guía
- cajas de explicación
- popups de éxito/bitácora
- formularios y nickname

## Regla permanente

No introducir un nuevo estilo de botón o caja por escena. Primero reutilizar `tokens.css` y `game-ui.css`; si falta una variante, agregarla al sistema común y documentarla aquí.

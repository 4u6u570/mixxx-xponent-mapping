# M-Audio Torq Xponent: Mixxx mapping

A controller mapping for the **M-Audio Torq Xponent** in **Mixxx 2.5** (tested on 2.5.6, macOS).

*English summary: drop both files into your Mixxx `controllers` folder, enable the device in Preferences → Controllers, choose "M-Audio Xponent (custom)", and restart Mixxx. The mapping supports both MIDI channel banks (A: ch 1-3, B: ch 6-8).*

## Instalación

1. Copiá los dos archivos a la carpeta `controllers` de Mixxx:
   - `M-Audio Xponent.midi.xml`
   - `M-Audio-Xponent-scripts.js`

   | Sistema | Carpeta |
   |---|---|
   | macOS (Mixxx de la web, sandbox) | `~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/controllers/` |
   | macOS (sin sandbox) | `~/Library/Application Support/Mixxx/controllers/` |
   | Windows | `%LOCALAPPDATA%\Mixxx\controllers\` |
   | Linux | `~/.mixxx/controllers/` |

2. Abrí Mixxx y entrá a **Preferencias → Controladores → Xponent**. Activalo y elegí el mapeo **"M-Audio Xponent (custom)"**.
3. **Reiniciá Mixxx.** Los cambios en el `.js` no se recargan solos.

## Audio (placa interna del Xponent)

Entrá a **Preferencias → Hardware de sonido → Salida** y configurá:

| Salida | Dispositivo | Canales |
|---|---|---|
| Principal (Master) | Xponent Audio | **3-4**: salida RCA Master, hacia la consola |
| Auriculares | Xponent Audio | **1-2** |

## Controles

| Control | Función |
|---|---|
| Play / Cue | Play/pausa y cue |
| Jog wheel | Pitch bend. Con el botón de scratch activado, hace scratch. |
| Flecha verde (tap) | Carga en su deck el tema seleccionado |
| Flecha verde (mantener) + jog | Recorre la biblioteca |
| Botones del touchpad (modo MIDI) | Suben y bajan en la biblioteca, con repetición si los mantenés |
| Touchpad | Parámetros 1 y 2 del efecto |
| Hotcues 1-5 | Setean o saltan a un hotcue. Con shift, lo borran. |
| Botones de loop | Beatloops de 4, 8, 16 y 32. Con shift: 1/8, 1/2, 1 y 2. |
| Loop in / out / reloop | Loop manual. Con shift, divide o duplica el loop. |
| Kills | Cortan graves, medios o agudos |
| Pitch fader | Velocidad (rate) |
| Volumen, EQ, ganancia, crossfader, mezcla de auriculares | Lo que indica su nombre |
| Sync, keylock, PFL, brake, spinback, reverse, beatjump | Lo que indica su nombre |

El mapeo funciona con los dos bancos de canales MIDI del Xponent, el A y el B.

## Créditos y licencia

El layout MIDI se tomó como referencia de [Mixco](https://github.com/arximboldi/mixco) (Juan Pedro Bolívar Puente, GPLv3). Este mapeo se publica bajo la licencia **GPL-3.0** (ver `LICENSE`).

/** Dispara la descarga de un Blob con el nombre indicado. */
export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Nombre de archivo con fecha: Avances_20260702.xlsx */
export function nombreConFecha(base: string, ext: string) {
  const f = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${base}_${f}.${ext}`
}

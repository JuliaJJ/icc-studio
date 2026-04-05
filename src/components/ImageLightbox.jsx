import { useEffect } from 'react'

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt={alt ?? ''} className="lightbox-img" onClick={e => e.stopPropagation()} />
    </div>
  )
}

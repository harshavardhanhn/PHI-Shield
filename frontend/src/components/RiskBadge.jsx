export default function HighlightedText({ html }) {
  if (!html) return null
  return (
    <div
      className="text-sm leading-relaxed text-gray-800 font-mono whitespace-pre-wrap break-words
                 bg-gray-50 border border-gray-100 rounded-lg p-4"
      // The backend only injects <mark> with specific classes — safe to render
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

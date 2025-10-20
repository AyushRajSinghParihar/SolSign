import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface TextSelectionToolbarProps {
  onExplain: (text: string) => void
}

export function TextSelectionToolbar({ onExplain }: TextSelectionToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [selectedText, setSelectedText] = useState('')

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (text && text.length >= 20 && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        setPosition({
          top: rect.top - 50 + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX,
        })
        setSelectedText(text)
      } else {
        setPosition(null)
      }
    }

    const handleClickOutside = () => {
      const selection = window.getSelection()
      if (!selection?.toString()) {
        setPosition(null)
      }
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!position) return null

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      <Button
        size="sm"
        onClick={() => {
          onExplain(selectedText)
          setPosition(null)
        }}
        className="shadow-lg"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Explain This
      </Button>
    </div>
  )
}


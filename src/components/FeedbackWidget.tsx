'use client'

import { useEffect, useId, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, X, ChevronDown, Paperclip, FileText } from 'lucide-react'
import type { FeedbackSeverity } from '@/types/database'

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i

// Some mobile camera/gallery pickers hand back a File with an empty `type`,
// so fall back to sniffing the filename extension.
function isImageFile(f: File): boolean {
  return f.type.startsWith('image/') || IMAGE_EXTENSIONS.test(f.name)
}

const SEVERITY_OPTIONS: { value: FeedbackSeverity; label: string; color: string }[] = [
  { value: 'bug',        label: 'Bug',        color: 'text-red-600' },
  { value: 'suggestion', label: 'Suggestion', color: 'text-blue-600' },
  { value: 'question',   label: 'Question',   color: 'text-amber-600' },
]

export default function FeedbackWidget({
  userId,
  userName,
  userEmail,
  orgId,
}: {
  userId: string
  userName: string
  userEmail: string
  orgId: string
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<FeedbackSeverity>('bug')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [attachError, setAttachError] = useState('')
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [previewFailed, setPreviewFailed] = useState<Record<number, boolean>>({})
  const fileInputId = useId()
  const pathname = usePathname()
  const supabase = createClient()

  // Create/revoke object URLs for image previews as the file list changes,
  // instead of calling createObjectURL fresh on every render (which leaks).
  useEffect(() => {
    const urls = files.map(f => (isImageFile(f) ? URL.createObjectURL(f) : ''))
    setPreviewUrls(urls)
    setPreviewFailed({})
    return () => urls.forEach(u => u && URL.revokeObjectURL(u))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  function openModal() {
    setMessage('')
    setSeverity('bug')
    setDone(false)
    setFiles([])
    setAttachError('')
    setSubmitError('')
    setOpen(true)
  }

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return
    setAttachError('')
    setFiles(prev => {
      const next = [...prev]
      for (const f of Array.from(picked)) {
        if (f.size > MAX_ATTACHMENT_BYTES) {
          setAttachError(`${f.name} is over 10MB and was skipped`)
          continue
        }
        if (next.length >= MAX_ATTACHMENTS) {
          setAttachError(`Only up to ${MAX_ATTACHMENTS} files can be attached`)
          break
        }
        next.push(f)
      }
      return next
    })
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSaving(true)
    setSubmitError('')

    const reportId = crypto.randomUUID()
    const attachmentPaths: string[] = []
    let failedUploads = 0

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${orgId}/${reportId}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage
        .from('feedback-attachments')
        .upload(path, file, { contentType: file.type || undefined })
      if (error) failedUploads++
      else attachmentPaths.push(path)
    }

    const { error: insertError } = await supabase.from('feedback_reports').insert({
      id: reportId,
      org_id: orgId,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      page_url: window.location.href,
      message: message.trim(),
      severity,
      attachment_paths: attachmentPaths,
    })

    setSaving(false)

    if (insertError) {
      setSubmitError(insertError.message)
      return
    }

    if (failedUploads > 0) {
      setSubmitError(`Report submitted, but ${failedUploads} attachment(s) failed to upload.`)
    }

    setDone(true)
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={openModal}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        Kath
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Kath</h2>
                <p className="text-xs text-gray-400 mt-0.5">Report an issue — goes directly to the owner</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center">
                <div className="text-3xl mb-3">✅</div>
                <p className="font-medium text-gray-800">Report submitted</p>
                <p className="text-sm text-gray-500 mt-1">The owner will look into it.</p>
                {submitError && (
                  <p className="text-xs text-amber-600 mt-2">{submitError}</p>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Auto-filled context — read-only display */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-600">From</span>
                    <span className="truncate">{userName} ({userEmail})</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-600">Page</span>
                    <span className="truncate text-right">{pathname}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-600">Time</span>
                    <span>{new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSeverity(opt.value)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          severity === opt.value
                            ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    What happened? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Describe the issue, what you expected, and what actually happened…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600 resize-none"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Attachments <span className="text-gray-400 font-normal">(screenshots, files — optional)</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                    disabled={files.length >= MAX_ATTACHMENTS}
                    className="sr-only"
                  />
                  <label
                    htmlFor={fileInputId}
                    className={`flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 w-fit ${
                      files.length >= MAX_ATTACHMENTS ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach file or image
                  </label>
                  {attachError && <p className="text-xs text-amber-600 mt-1.5">{attachError}</p>}
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
                          {previewUrls[i] && !previewFailed[i] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={previewUrls[i]}
                              alt={f.name}
                              className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-200"
                              onError={() => setPreviewFailed(prev => ({ ...prev, [i]: true }))}
                            />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="flex-1 truncate text-gray-700">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-gray-400 hover:text-red-600 flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {submitError && !done && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={saving || !message.trim()}
                  className="w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Submitting…' : 'Submit Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
